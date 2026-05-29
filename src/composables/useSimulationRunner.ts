import { ref } from 'vue'
import { useControllerBridge } from './useControllerBridge'
import { isSimulationRunning, beginRun, updateFrame, resetRuntime, clearOutput, type ControllerStats } from './useSimulationState'
import { useModelLoader } from './useModelLoader'
import { createMeasuredSolver } from '@/simulation/solver-stats'
import { rk4Solver } from '@/simulation/solvers/rk4'

/**
 * 仿真运行器 — 模块级单例，驱动仿真循环。
 *
 * 侧栏 "运行" 按钮调用 start(code)，启动迭代循环：
 *   1. 加载用户 Python controller
 *   2. 每帧：call controller → solver.step → updateFrame
 *
 * 编辑器 "运行" 按钮不走这里，只执行一次 Python 代码（useCodeExecutor）。
 *
 * isRunning 直接引用 isSimulationRunning，保证全局唯一。
 */
const bridge = useControllerBridge()
const { currentPlant } = useModelLoader()

const isRunning = isSimulationRunning
const error = ref<string | null>(null)

const measured = createMeasuredSolver(rk4Solver, 'RK4')
let rafId = 0
let state: Float64Array | null = null
let t = 0
let startPlantId = ''
const dt = 0.005 // 仿真步长

// controller 调用耗时滑动窗口
const CTRL_WINDOW = 50
const ctrlWindow: number[] = []
let ctrlWindowSum = 0
const ctrlStats: ControllerStats = { lastCallTime: 0, avgCallTime: 0 }

/**
 * 启动仿真。
 * @param code 用户 Python 代码（必须定义 controller 函数）
 */
async function start(code: string) {
  if (isRunning.value) return
  error.value = null
  clearOutput()

  // 加载 controller
  const ok = await bridge.load(code)
  if (!ok) {
    error.value = bridge.error.value
    return
  }

  // 检查 plant
  const plant = currentPlant.value
  if (!plant) {
    error.value = '请先选择被控模型'
    return
  }

  // 初始化状态
  beginRun()
  state = plant.getInitialState()
  t = 0
  startPlantId = plant.id
  measured.reset()
  ctrlWindow.length = 0
  ctrlWindowSum = 0
  ctrlStats.lastCallTime = 0
  ctrlStats.avgCallTime = 0

  // 仿真循环
  function tick() {
    if (!isRunning.value || !state) return

    const plant = currentPlant.value
    if (!plant || plant.id !== startPlantId) { stop(); return }

    // 1. 调用 Python controller（计时）
    const ctrlStart = performance.now()
    const u = bridge.call(state, t)
    const ctrlElapsed = performance.now() - ctrlStart

    ctrlWindow.push(ctrlElapsed)
    ctrlWindowSum += ctrlElapsed
    if (ctrlWindow.length > CTRL_WINDOW) {
      ctrlWindowSum -= ctrlWindow.shift()!
    }
    ctrlStats.lastCallTime = ctrlElapsed
    ctrlStats.avgCallTime = ctrlWindowSum / ctrlWindow.length

    // 2. 求解器推进一步
    const input = new Float64Array([u])
    state = measured.step(plant, t, state, input, dt)

    // 3. 计算中间变量
    const intermediates = plant.intermediates(t, state, input)

    // 4. 更新 UI 状态
    updateFrame(state, input, intermediates, { ...measured.stats }, { ...ctrlStats })

    t += dt
    rafId = requestAnimationFrame(tick)
  }

  rafId = requestAnimationFrame(tick)
}

function stop() {
  isRunning.value = false
  if (rafId) {
    cancelAnimationFrame(rafId)
    rafId = 0
  }
  resetRuntime()
}

export function useSimulationRunner() {
  return {
    isRunning,
    error,
    stats: measured.stats,
    start,
    stop,
  }
}

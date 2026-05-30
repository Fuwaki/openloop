import { computed, ref } from 'vue'
import { useControllerBridge } from './useControllerBridge'
import { currentCode, isSimulationRunning, isSimulationPaused, controllerStatusNames, beginRun, updateFrame, resetRuntime, clearOutput, type ControllerStats } from './useSimulationState'
import { useModelLoader } from './useModelLoader'
import { injectOpenLoop, updateParamValues, clearOpenLoop, getStatusValues } from './useOpenLoopModule'
import { userParams, syncUserParams } from './useUserParams'
import { analyze } from './useCodeAnalyzer'
import { createMeasuredSolver } from '@/simulation/solver-stats'
import { rk4Solver } from '@/simulation/solvers/rk4'
import { eulerSolver } from '@/simulation/solvers/euler'
import type { ODESolver } from '@/simulation/types'

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
const isPaused = isSimulationPaused
const error = ref<string | null>(null)

// ── 可配置的仿真参数 ──────────────────────────────────────────
export type SolverId = 'rk4' | 'euler'

const SOLVERS: Record<SolverId, { solver: ODESolver; label: string }> = {
  rk4: { solver: rk4Solver, label: 'RK4' },
  euler: { solver: eulerSolver, label: 'Euler' },
}

const simDt = ref(0.005)
const solverId = ref<SolverId>('rk4')

let measured = createMeasuredSolver(rk4Solver, 'RK4')
const solverVersion = ref(0)
let rafId = 0
let state: Float64Array | null = null
let t = 0
let startPlantId = ''

function applySolver(id: SolverId) {
  const entry = SOLVERS[id]!
  measured = createMeasuredSolver(entry.solver, entry.label)
  solverVersion.value++
}

function setSolver(id: SolverId) {
  solverId.value = id
  applySolver(id)
}

function setSimDt(value: number) {
  simDt.value = Math.max(0.0001, value)
}

// controller 调用耗时滑动窗口
const CTRL_WINDOW = 50
const ctrlWindow: number[] = []
let ctrlWindowSum = 0
const ctrlStats: ControllerStats = { lastCallTime: 0, avgCallTime: 0 }

/**
 * 启动仿真。
 * 从 currentCode 读取最新代码，保证与编辑器运行使用同一份代码。
 */
async function start() {
  if (isPaused.value) { resume(); return }
  if (isRunning.value) return
  error.value = null
  clearOutput()

  // 注入 openloop 模块并清空旧状态
  try {
    await injectOpenLoop()
    clearOpenLoop()
  } catch (e) {
    error.value = `模块注入失败: ${e instanceof Error ? e.message : String(e)}`
    return
  }

  // 分析代码，提取用户参数和状态名称（即使未打开编辑器也能生效）
  const analysis = await analyze(currentCode.value)
  syncUserParams(analysis.olCalls)
  controllerStatusNames.value = analysis.olCalls
    .filter((c) => c.name === 'openloop.status')
    .map((c) => (typeof c.args[0] === 'string' ? c.args[0] : `status_${c.line}`))

  // 加载 controller
  const ok = await bridge.load(currentCode.value)
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

  rafId = requestAnimationFrame(tick)
}

// 仿真循环 — 模块级，供 start / resume 共用
function tick() {
  if (!isRunning.value || isPaused.value || !state) return

  const plant = currentPlant.value
  if (!plant || plant.id !== startPlantId) { stop(); return }

  try {
    // 0. 同步用户参数到 openloop 模块
    if (userParams.value.length > 0) {
      const vals: Record<string, number> = {}
      for (const p of userParams.value) vals[p.name] = p.value
      updateParamValues(vals)
    }

    // 1. 调用 Python controller（计时）
    const ctrlStart = performance.now()
    const u = bridge.call(state, t)
    const ctrlElapsed = performance.now() - ctrlStart

    ctrlWindow.push(ctrlElapsed)
    ctrlWindowSum += ctrlElapsed
    if (ctrlWindow.length > CTRL_WINDOW) {
      const shifted = ctrlWindow.shift()
      if (shifted !== undefined) ctrlWindowSum -= shifted
    }
    ctrlStats.lastCallTime = ctrlElapsed
    ctrlStats.avgCallTime = ctrlWindow.length > 0 ? ctrlWindowSum / ctrlWindow.length : 0

    // 2. 求解器推进一步
    const input = new Float64Array([u])
    const currentDt = simDt.value
    state = measured.step(plant, t, state, input, currentDt)

    // 检测数值发散
    for (let i = 0; i < state.length; i++) {
      if (!Number.isFinite(state[i])) {
        error.value = `数值发散: state[${i}] = ${state[i]}，仿真已停止`
        stop()
        return
      }
    }

    // 3. 计算中间变量（使用更新后的时间 t + dt）
    const intermediates = plant.intermediates(t + currentDt, state, input)

    // 4. 读取用户暴露状态并更新 UI 状态
    const statusValues = getStatusValues()
    updateFrame(state, input, intermediates, { ...measured.stats }, { ...ctrlStats }, statusValues)

    t += currentDt
  } catch (e) {
    error.value = `仿真错误: ${e instanceof Error ? e.message : String(e)}`
    stop()
    return
  }

  rafId = requestAnimationFrame(tick)
}

function stop() {
  isRunning.value = false
  isPaused.value = false
  if (rafId) {
    cancelAnimationFrame(rafId)
    rafId = 0
  }
  resetRuntime()
}

function pause() {
  if (!isRunning.value || isPaused.value) return
  isPaused.value = true
  if (rafId) {
    cancelAnimationFrame(rafId)
    rafId = 0
  }
}

function resume() {
  if (!isRunning.value || !isPaused.value) return
  isPaused.value = false
  rafId = requestAnimationFrame(tick)
}

export function useSimulationRunner() {
  const stats = computed(() => {
    solverVersion.value // track solver changes
    return measured.stats
  })

  return {
    isRunning,
    isPaused,
    error,
    stats,
    start,
    stop,
    pause,
    resume,
    simDt,
    solverId,
    setSimDt,
    setSolver,
  }
}

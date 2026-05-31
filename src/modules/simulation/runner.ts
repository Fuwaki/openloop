import { computed, ref } from 'vue'
import { useControllerBridge } from '@/modules/python/bridge'
import {
  isSimulationRunning,
  isSimulationPaused,
  beginRun,
  updateFrame,
  resetRuntime,
  clearOutput,
  getCurrentCode,
  type ControllerStats,
} from './state'
import { injectOpenLoop, updateParamValues, clearOpenLoop, getStatusValues } from '@/modules/python/openloop'
import { userParams } from './user-params'
import { syncAnalysisResult } from './analysis-sync'
import { createMeasuredSolver } from '@/simulation/solver-stats'
import { rk4Solver } from '@/simulation/solvers/rk4'
import { eulerSolver } from '@/simulation/solvers/euler'
import type { ODESolver } from '@/simulation/types'
import type { PlantModel } from '@/simulation/plants/types'

// ── 注入 getPlant（消除 simulation/ → models/ 反向依赖）──────────
let getPlant: (() => PlantModel | null) | null = null

export function injectGetPlant(fn: () => PlantModel | null) {
  getPlant = fn
}

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

const bridge = useControllerBridge()

const isRunning = isSimulationRunning
const isPaused = isSimulationPaused
const error = ref<string | null>(null)

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

// ── 子函数：同步参数 ─────────────────────────────────────────
function syncParams() {
  if (userParams.value.length > 0) {
    const vals: Record<string, number> = {}
    for (const p of userParams.value) vals[p.name] = p.value
    updateParamValues(vals)
  }
}

// ── 子函数：调用 controller ──────────────────────────────────
function callController(stateArr: Float64Array, time: number): Float64Array {
  const ctrlStart = performance.now()
  const u = bridge.call(stateArr, time)
  const ctrlElapsed = performance.now() - ctrlStart

  ctrlWindow.push(ctrlElapsed)
  ctrlWindowSum += ctrlElapsed
  if (ctrlWindow.length > CTRL_WINDOW) {
    const shifted = ctrlWindow.shift()
    if (shifted !== undefined) ctrlWindowSum -= shifted
  }
  ctrlStats.lastCallTime = ctrlElapsed
  ctrlStats.avgCallTime = ctrlWindow.length > 0 ? ctrlWindowSum / ctrlWindow.length : 0

  return new Float64Array([u])
}

// ── 子函数：求解器推进一步 ──────────────────────────────────
function stepSolver(plant: PlantModel, input: Float64Array, dt: number): boolean {
  state = measured.step(plant, t, state!, input, dt)

  for (let i = 0; i < state.length; i++) {
    if (!Number.isFinite(state[i])) {
      error.value = `数值发散: state[${i}] = ${state[i]}，仿真已停止`
      stop()
      return false
    }
  }
  return true
}

// ── 仿真循环 ────────────────────────────────────────────────
function tick() {
  if (!isRunning.value || isPaused.value || !state) return

  const plant = getPlant?.()
  if (!plant || plant.id !== startPlantId) { stop(); return }

  try {
    syncParams()

    const input = callController(state, t)
    const currentDt = simDt.value

    if (!stepSolver(plant, input, currentDt)) return

    const intermediates = plant.intermediates(t + currentDt, state, input)
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

/**
 * 启动仿真。
 * 从 currentCode 读取最新代码，保证与编辑器运行使用同一份代码。
 */
async function start() {
  if (isPaused.value) { resume(); return }
  if (isRunning.value) return
  error.value = null
  clearOutput()

  try {
    await injectOpenLoop()
    clearOpenLoop()
  } catch (e) {
    error.value = `模块注入失败: ${e instanceof Error ? e.message : String(e)}`
    return
  }

  const code = getCurrentCode()
  await syncAnalysisResult(code)

  const ok = await bridge.load(code)
  if (!ok) {
    error.value = bridge.error.value
    return
  }

  const plant = getPlant?.()
  if (!plant) {
    error.value = '请先选择被控模型'
    return
  }

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
    void solverVersion.value // track solver changes
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

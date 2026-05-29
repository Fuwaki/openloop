import { ref } from 'vue'
import type { SolverStats } from '@/simulation/solver-stats'

export interface ControllerStats {
  lastCallTime: number  // 上一次 controller 调用耗时 (ms)
  avgCallTime: number   // 平均调用耗时 (ms)
}

/**
 * 仿真状态中心 — 单例，供检查器面板和其他组件读取。
 * 仿真引擎运行时写入，UI 组件只读。
 *
 * 模型加载由 useModelLoader 负责，这里只存运行时状态。
 */

/** 编辑器当前代码（用户编辑时实时更新） */
const currentCode = ref('')

/** 当前状态向量 */
const currentState = ref<Float64Array | null>(null)

/** 当前输入向量 */
const currentInput = ref<Float64Array | null>(null)

/** 当前中间变量 */
const currentIntermediates = ref<Float64Array | null>(null)

/** 求解器统计 */
const solverStats = ref<SolverStats | null>(null)

/** Controller 性能统计 */
const controllerStats = ref<ControllerStats | null>(null)

/** Python 输出历史（编辑器运行和仿真共享） */
const outputHistory = ref<Array<{ type: 'stdout' | 'stderr' | 'error' | 'result'; text: string }>>([])

/** 仿真运行批次 ID。每次开始一轮连续仿真时递增。 */
const simulationRunId = ref(0)

/** 仿真是否正在运行 */
const isSimulationRunning = ref(false)

/** 重置运行时状态（模型切换或仿真停止时调用） */
function resetRuntime() {
  isSimulationRunning.value = false
  currentState.value = null
  currentInput.value = null
  currentIntermediates.value = null
  solverStats.value = null
  controllerStats.value = null
}

function beginRun() {
  simulationRunId.value++
  isSimulationRunning.value = true
  currentState.value = null
  currentInput.value = null
  currentIntermediates.value = null
  solverStats.value = null
  controllerStats.value = null
}

function updateFrame(
  state: Float64Array,
  input: Float64Array,
  intermediates: Float64Array,
  stats: SolverStats,
  ctrlStats?: ControllerStats,
) {
  currentState.value = state
  currentInput.value = input
  currentIntermediates.value = intermediates
  solverStats.value = stats
  if (ctrlStats) controllerStats.value = ctrlStats
}

function appendOutput(entry: { type: 'stdout' | 'stderr' | 'error' | 'result'; text: string }) {
  outputHistory.value.push(entry)
}

function clearOutput() {
  outputHistory.value = []
}

export { isSimulationRunning, beginRun, updateFrame, clearOutput, appendOutput, resetRuntime }

export function useSimulationState() {
  return {
    currentCode,
    isSimulationRunning,
    currentState,
    currentInput,
    currentIntermediates,
    solverStats,
    controllerStats,
    outputHistory,
    simulationRunId,
    beginRun,
    resetRuntime,
    updateFrame,
    appendOutput,
    clearOutput,
  }
}

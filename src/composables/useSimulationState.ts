import { ref } from 'vue'
import type { SolverStats } from '@/simulation/solver-stats'

export interface ControllerStats {
  lastCallTime: number  // 上一次 controller 调用耗时 (ms)
  avgCallTime: number   // 平均调用耗时 (ms)
}

export interface ControllerStatus {
  name: string
  value: number
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

/** Python controller 通过 ol.status 暴露的中间变量 */
const controllerStatus = ref<ControllerStatus[]>([])

/** 从代码分析中提取的 ol.status 名称（用于未运行时占位显示） */
const controllerStatusNames = ref<string[]>([])

/** Python 输出历史（编辑器运行和仿真共享） */
const outputHistory = ref<Array<{ type: 'stdout' | 'stderr' | 'error' | 'result'; text: string }>>([])

/** 仿真运行批次 ID。每次开始一轮连续仿真时递增。 */
const simulationRunId = ref(0)

/** 仿真是否正在运行 */
const isSimulationRunning = ref(false)

/** 仿真是否暂停 */
const isSimulationPaused = ref(false)

// ─── 历史数据存储 ────────────────────────────────────────────
// 按信号 key 存储完整仿真历史，供图表等消费方按需读取。
// key 格式：'t' / 's_状态名' / 'i_输入名' / 'm_中间变量名' / 'c_status名'
// 性能：单 flat array 追加，无 per-frame 分配，splice 原地修剪。

const MAX_HISTORY_POINTS = 100_000
const historyVersion = ref(0)
const history = new Map<string, number[]>()
const historyKeys: string[] = []

function initHistory(timeKey: string, signalKeys: readonly string[]) {
  history.clear()
  historyKeys.length = 0
  const allKeys = [timeKey, ...signalKeys]
  for (const key of allKeys) {
    history.set(key, [])
    historyKeys.push(key)
  }
}

function appendHistory(values: ArrayLike<number>) {
  const len = Math.min(values.length, historyKeys.length)
  for (let i = 0; i < len; i++) {
    history.get(historyKeys[i]!)!.push(values[i]!)
  }
  historyVersion.value++
  if (history.get(historyKeys[0]!)!.length > MAX_HISTORY_POINTS) {
    const removeCount = history.get(historyKeys[0]!)!.length - MAX_HISTORY_POINTS
    for (const key of historyKeys) {
      history.get(key)!.splice(0, removeCount)
    }
  }
}

function getHistoryBuffer(key: string): number[] {
  return history.get(key) ?? []
}

function clearHistory() {
  for (const key of historyKeys) {
    const buf = history.get(key)
    if (buf) buf.length = 0
  }
  historyVersion.value++
}

// ─── 生命周期 ────────────────────────────────────────────────

/** 重置运行时状态（模型切换或仿真停止时调用） */
function resetRuntime() {
  isSimulationRunning.value = false
  isSimulationPaused.value = false
  currentState.value = null
  currentInput.value = null
  currentIntermediates.value = null
  solverStats.value = null
  controllerStats.value = null
  controllerStatus.value = []
  history.clear()
  historyKeys.length = 0
}

function beginRun() {
  resetRuntime()
  simulationRunId.value++
  isSimulationRunning.value = true
}

function updateFrame(
  state: Float64Array,
  input: Float64Array,
  intermediates: Float64Array,
  stats: SolverStats,
  ctrlStats?: ControllerStats,
  statusValues?: Record<string, unknown>,
) {
  currentState.value = state
  currentInput.value = input
  currentIntermediates.value = intermediates
  solverStats.value = stats
  if (ctrlStats) controllerStats.value = ctrlStats
  if (statusValues) {
    controllerStatus.value = Object.entries(statusValues)
      .map(([name, value]) => ({ name, value: Number(value) }))
      .filter((status) => Number.isFinite(status.value))
  }
}

function appendOutput(entry: { type: 'stdout' | 'stderr' | 'error' | 'result'; text: string }) {
  outputHistory.value.push(entry)
}

function clearOutput() {
  outputHistory.value = []
}

export { currentCode, isSimulationRunning, isSimulationPaused, controllerStatusNames, beginRun, updateFrame, clearOutput, appendOutput, resetRuntime, initHistory, appendHistory, getHistoryBuffer, clearHistory, historyVersion }

export function useSimulationState() {
  return {
    currentCode,
    isSimulationRunning,
    isSimulationPaused,
    currentState,
    currentInput,
    currentIntermediates,
    solverStats,
    controllerStats,
    controllerStatus,
    controllerStatusNames,
    outputHistory,
    simulationRunId,
    beginRun,
    resetRuntime,
    updateFrame,
    appendOutput,
    clearOutput,
    initHistory,
    appendHistory,
    getHistoryBuffer,
    clearHistory,
    historyVersion,
  }
}

// state — public reactive refs and lifecycle hooks
export {
  currentCode,
  setCurrentCode,
  clearCurrentCode,
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
  historyVersion,
  appendOutput,
  clearOutput,
  initHistory,
  appendHistory,
  getHistoryBuffer,
  clearHistory,
  useSimulationState,
  type ControllerStats,
  type ControllerStatus,
} from './state'

// runner
export { useSimulationRunner, injectGetPlant, type SolverId } from './runner'

// controller loader
export { useControllerLoader } from './controller-loader'

// executor
export { useCodeExecutor } from './executor'

// analyzer
export { analyze, useCodeAnalyzer, type AnalysisResult, type OlCall, type SyntaxError, type ControllerInfo } from './analyzer'

// user params
export { userParams, syncUserParams, useUserParams, type UserParamDef } from './user-params'

// code generator
export { generateControllerCode } from './code-generator'

// analysis sync
export { syncAnalysisResult } from './analysis-sync'

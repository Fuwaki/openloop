// model table
export {
  getModelEntry,
  getModelsByCategory,
  DEFAULT_MODEL_ID,
  type ModelEntry,
  type ParamDef,
  type VarSpec,
  type IOSpec,
  type ControlObjective,
} from './model-table'

// controller table
export {
  matchControllerFamily,
  matchControllerVariant,
  resolveVariantCode,
  getControllerVariant,
  getControllersByCategory,
  emptyCode,
  type ControllerFamily,
  type ControllerVariant,
  type ControllerSelection,
  type ControllerCategory,
  type ControllerParamDef,
  type GenerationMode,
} from './controller-table'

// tags
export type { SystemTag, MatchResult } from './tags'

// model loader
export { useModelLoader, injectSimulationStop } from './model-loader'

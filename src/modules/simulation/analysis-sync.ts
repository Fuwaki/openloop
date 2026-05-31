import { controllerStatusNames } from './state'
import { analyze } from './analyzer'
import { syncUserParams } from './user-params'

/**
 * 统一的代码分析同步。
 * 曾在 4 处重复：useModelLoader、useControllerLoader、useSimulationRunner、PanelEditor。
 */
export async function syncAnalysisResult(code: string) {
  const analysis = await analyze(code)
  syncUserParams(analysis.olCalls)
  controllerStatusNames.value = analysis.olCalls
    .filter((c) => c.name === 'openloop.status')
    .map((c) => (typeof c.args[0] === 'string' ? c.args[0] : `status_${c.line}`))
  return analysis
}

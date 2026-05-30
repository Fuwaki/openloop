import { ref } from 'vue'
import {
  getControllerVariant,
  getControllersByCategory,
  matchControllerVariant,
  type ControllerSelection,
} from '@/models/controller-table'
import { useModelLoader } from './useModelLoader'
import { generateControllerCode } from './useCodeGenerator'
import { currentCode, controllerStatusNames, isSimulationRunning } from './useSimulationState'
import { useSimulationRunner } from './useSimulationRunner'
import { analyze } from './useCodeAnalyzer'
import { syncUserParams } from './useUserParams'

const currentController = ref<ControllerSelection | null>(null)

async function loadController(familyId: string, variantId: string): Promise<boolean> {
  const selection = getControllerVariant(familyId, variantId)
  if (!selection) return false

  const { currentEntry } = useModelLoader()
  if (currentEntry.value) {
    const match = matchControllerVariant(currentEntry.value, selection.variant)
    if (!match.compatible) return false
    currentCode.value = generateControllerCode(currentEntry.value, selection.variant)

    const analysis = await analyze(currentCode.value)
    syncUserParams(analysis.olCalls)
    controllerStatusNames.value = analysis.olCalls
      .filter((c) => c.name === 'openloop.status')
      .map((c) => (typeof c.args[0] === 'string' ? c.args[0] : `status_${c.line}`))
  }

  currentController.value = selection

  if (isSimulationRunning.value) {
    const runner = useSimulationRunner()
    runner.stop()
    void runner.start()
  }

  return true
}

function clearController() {
  currentController.value = null
}

export function useControllerLoader() {
  return {
    currentController,
    loadController,
    clearController,
    getControllersByCategory,
  }
}

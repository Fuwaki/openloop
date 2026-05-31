import { ref } from 'vue'
import {
  getControllerVariant,
  getControllersByCategory,
  matchControllerVariant,
  type ControllerSelection,
} from '@/modules/models/controller-table'
import { useModelLoader } from '@/modules/models/model-loader'
import { generateControllerCode } from './code-generator'
import { setCurrentCode, isSimulationRunning } from './state'
import { useSimulationRunner } from './runner'
import { syncAnalysisResult } from './analysis-sync'

const currentController = ref<ControllerSelection | null>(null)

async function loadController(familyId: string, variantId: string): Promise<boolean> {
  const selection = getControllerVariant(familyId, variantId)
  if (!selection) return false

  const { currentEntry } = useModelLoader()
  if (currentEntry.value) {
    const match = matchControllerVariant(currentEntry.value, selection.variant)
    if (!match.compatible) return false
    const code = generateControllerCode(currentEntry.value, selection.variant)
    setCurrentCode(code)
    await syncAnalysisResult(code)
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

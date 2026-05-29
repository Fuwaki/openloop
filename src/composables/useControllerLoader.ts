import { ref } from 'vue'
import { getControllerEntry, getControllersByCategory, type ControllerEntry } from '@/models/controller-table'
import { useModelLoader } from './useModelLoader'
import { generateControllerCode } from './useCodeGenerator'
import { currentCode } from './useSimulationState'

const currentController = ref<ControllerEntry | null>(null)

function loadController(id: string): boolean {
  const entry = getControllerEntry(id)
  if (!entry) return false

  const { currentEntry } = useModelLoader()
  if (currentEntry.value) {
    currentCode.value = generateControllerCode(
      currentEntry.value,
      entry.starterCode,
      entry.inputRequirements,
    )
  }

  currentController.value = entry
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

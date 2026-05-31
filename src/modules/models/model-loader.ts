import { ref, shallowRef } from 'vue'
import { getModelEntry, getModelsByCategory, type ModelEntry, type ParamDef } from './model-table'
import { emptyCode } from './controller-table'
import type { PlantModel } from '@/simulation/plants/types'
import { setCurrentCode, clearCurrentCode } from '@/modules/simulation/state'
import { generateControllerCode } from '@/modules/simulation/code-generator'
import { syncAnalysisResult } from '@/modules/simulation/analysis-sync'
import { usePyodide } from '@/modules/python/pyodide'

// ── 注入停止回调（消除 models/ → simulation/ 循环依赖）──
let simulationStop: (() => void) | null = null

export function injectSimulationStop(fn: () => void) {
  simulationStop = fn
}

const currentEntry = ref<ModelEntry | null>(null)
const currentPlant = shallowRef<PlantModel | null>(null)

/** 当前参数副本（UI 绑定） */
const currentParams = ref<ParamDef[]>([])

/**
 * 加载模型。
 * 重复调用同一模型不重建 plant，仅刷新引用。
 * 内部自动停止正在运行的仿真并重置运行时状态。
 */
async function loadModel(id: string, params?: Record<string, number>): Promise<boolean> {
  const entry = getModelEntry(id)
  if (!entry) return false

  simulationStop?.()

  currentEntry.value = entry
  currentParams.value = entry.params.map((p) => ({ ...p }))

  if (params) {
    for (const p of currentParams.value) {
      if (params[p.name] !== undefined) p.value = params[p.name]!
    }
  }

  const paramMap: Record<string, number> = {}
  for (const p of currentParams.value) paramMap[p.name] = p.value

  currentPlant.value = entry.createPlant(paramMap)
  const code = generateControllerCode(entry, emptyCode)
  setCurrentCode(code)

  await usePyodide().init()
  await syncAnalysisResult(code)

  return true
}

function clearModel() {
  currentEntry.value = null
  currentPlant.value = null
  clearCurrentCode()
  currentParams.value = []
}

export function useModelLoader() {
  return {
    currentEntry,
    currentPlant,
    currentParams,
    loadModel,
    clearModel,
    getModelsByCategory,
  }
}

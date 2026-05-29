import { ref, shallowRef } from 'vue'
import { getModelEntry, getModelsByCategory, type ModelEntry, type ParamDef } from '@/models/model-table'
import type { PlantModel } from '@/simulation/plants/types'

/**
 * 模型加载器 — 单例。
 *
 * 唯一入口：loadModel(id) 完成一切联动：
 *   1. 查找模型表条目
 *   2. 创建仿真用 PlantModel
 *   3. 设置 starterCode
 *   4. 重置仿真状态
 *
 * UI 组件只读消费，不直接操作 useSimulationState。
 */

const currentEntry = ref<ModelEntry | null>(null)
const currentPlant = shallowRef<PlantModel | null>(null)
const starterCode = ref<string | null>(null)

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

  // 自保：停止正在运行的仿真并重置运行时状态
  // 使用动态 import 避免与 useSimulationRunner 的循环依赖
  try {
    const { useSimulationRunner } = await import('./useSimulationRunner')
    useSimulationRunner().stop()
  } catch {
    // useSimulationRunner 加载失败时不影响模型切换
  }

  currentEntry.value = entry
  currentParams.value = entry.params.map((p) => ({ ...p }))

  // 如果传了自定义参数，覆盖默认值
  if (params) {
    for (const p of currentParams.value) {
      if (params[p.name] !== undefined) p.value = params[p.name]!
    }
  }

  // 从 UI 参数提取 Record<string, number>
  const paramMap: Record<string, number> = {}
  for (const p of currentParams.value) paramMap[p.name] = p.value

  currentPlant.value = entry.createPlant(paramMap)
  starterCode.value = entry.starterCode

  return true
}

function clearModel() {
  currentEntry.value = null
  currentPlant.value = null
  starterCode.value = null
  currentParams.value = []
}

export function useModelLoader() {
  return {
    currentEntry,
    currentPlant,
    starterCode,
    currentParams,
    loadModel,
    clearModel,
    getModelsByCategory,
  }
}

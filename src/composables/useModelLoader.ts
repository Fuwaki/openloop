import { ref, shallowRef } from 'vue'
import { getModelEntry, getModelsByCategory, type ModelEntry, type ParamDef } from '@/models/model-table'
import { emptyCode } from '@/models/controller-table'
import type { PlantModel } from '@/simulation/plants/types'
import { currentCode, controllerStatusNames } from './useSimulationState'
import { generateControllerCode } from './useCodeGenerator'
import { usePyodide } from './usePyodide'
import { analyze } from './useCodeAnalyzer'
import { syncUserParams } from './useUserParams'

/**
 * 模型加载器 — 单例。
 *
 * 唯一入口：loadModel(id) 完成一切联动：
 *   1. 查找模型表条目
 *   2. 创建仿真用 PlantModel
 *   3. 设置 currentCode（示例代码）
 *   4. 重置仿真状态
 *
 * UI 组件只读消费，不直接操作 useSimulationState。
 */

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
  currentCode.value = generateControllerCode(entry, emptyCode)

  // 提前初始化 Pyodide 并分析代码，提取用户参数和状态名称
  await usePyodide().init()
  const analysis = await analyze(currentCode.value)
  syncUserParams(analysis.olCalls)
  controllerStatusNames.value = analysis.olCalls
    .filter((c) => c.name === 'openloop.status')
    .map((c) => (typeof c.args[0] === 'string' ? c.args[0] : `status_${c.line}`))

  return true
}

function clearModel() {
  currentEntry.value = null
  currentPlant.value = null
  currentCode.value = ''
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

import type { PlantModel } from './types'
import { getModelEntry } from '@/models/model-table'

/**
 * 根据模型 ID 和参数创建仿真用 PlantModel。
 * 从 model-table 获取工厂函数。
 */
export function createPlant(id: string, params?: Record<string, number>): PlantModel | null {
  const entry = getModelEntry(id)
  return entry ? entry.createPlant(params) : null
}

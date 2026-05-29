import type { SystemModel } from '../types'

/** 变量定义 — 状态/输入/输出/中间变量的元信息 */
export interface VariableDef {
  /** 变量名（代码中使用） */
  name: string
  /** 单位 */
  unit: string
  /** 显示标签（UI 中使用） */
  label: string
}

/** 被控对象接口 */
export interface PlantModel extends SystemModel {
  id: string
  name: string
  description: string
  category: 'linear' | 'nonlinear'

  /** 状态变量定义，顺序对应 state 数组下标 */
  stateVars: VariableDef[]
  /** 输入变量定义，顺序对应 input 数组下标 */
  inputVars: VariableDef[]
  /** 输出变量定义，顺序对应 output() 返回值下标 */
  outputVars: VariableDef[]
  /** 中间变量定义（调试用），顺序对应 intermediates() 返回值下标 */
  intermediateVars: VariableDef[]

  /** 当前参数值 */
  params: Record<string, number>

  /** 设置单个参数 */
  setParam(name: string, value: number): void
  /** 获取初始状态 */
  getInitialState(): Float64Array
  /** 获取默认输入 */
  getDefaultInput(): Float64Array
  /** 计算中间变量（调试/可视化用） */
  intermediates(t: number, state: Float64Array, input: Float64Array): Float64Array
}

/** 创建 VariableDef 的快捷函数 */
export function variable(name: string, unit: string, label: string): VariableDef {
  return { name, unit, label }
}

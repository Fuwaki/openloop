import type { PlantModel } from './types'
import { variable } from './types'

/**
 * 一阶惯性系统
 *
 * 微分方程: τ ẋ + x = K·u
 * 一阶形式: dx/dt = (K·u - x) / τ
 *
 * 状态: [x] — 输出（温度、液位等）
 * 输入: [u] — 控制输入
 * 中间: [dx, error, steady_state]
 */
export function createFirstOrder(params?: { tau?: number; K?: number }): PlantModel {
  const p = {
    tau: params?.tau ?? 1.0,
    K: params?.K ?? 1.0,
  }

  return {
    id: 'first-order',
    name: '一阶惯性系统',
    description: '一阶惯性环节 τẋ + x = K·u，指数响应',
    category: 'linear',

    stateVars: [
      variable('x', '', '输出'),
    ],
    inputVars: [
      variable('u', '', '输入'),
    ],
    outputVars: [
      variable('x', '', '输出'),
    ],
    intermediateVars: [
      variable('dx', '/s', '变化率'),
      variable('e', '', '误差'),
      variable('x_ss', '', '稳态值'),
    ],

    params: p,

    setParam(name: string, value: number) {
      if (name in p) (p as Record<string, number>)[name] = value
    },

    getInitialState() {
      return new Float64Array([0])
    },

    getDefaultInput() {
      return new Float64Array([1])
    },

    derivatives(_t: number, state: Float64Array, input: Float64Array) {
      const x = state[0]!
      const u = input[0]!
      return new Float64Array([(p.K * u - x) / p.tau])
    },

    output(_t: number, state: Float64Array) {
      return new Float64Array([state[0]!])
    },

    intermediates(_t: number, state: Float64Array, input: Float64Array) {
      const x = state[0]!
      const u = input[0]!
      const dx = (p.K * u - x) / p.tau
      const e = p.K * u - x
      const x_ss = p.K * u
      return new Float64Array([dx, e, x_ss])
    },
  }
}

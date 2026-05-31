import type { PlantModel } from './types'
import { variable } from './types'

/**
 * 非线性液位水箱系统
 *
 * 微分方程: dh/dt = (u - a * sqrt(max(h, 0))) / A
 *
 * 状态: [h] — 液位（m）
 * 输入: [u] — 入口流量（m³/s）
 * 中间: [Q_out, dh_dt, level_pct]
 */
export function createTankLevel(params?: { A?: number; a?: number }): PlantModel {
  const p = {
    A: params?.A ?? 1.0,
    a: params?.a ?? 0.5,
  }

  return {
    id: 'tank-level',
    name: '液位水箱',
    description: '非线性液位系统，出口流量与液位平方根成正比',
    category: 'nonlinear',

    stateVars: [
      variable('h', 'm', '液位'),
    ],
    inputVars: [
      variable('u', 'm³/s', '入口流量'),
    ],
    outputVars: [
      variable('h', 'm', '液位'),
    ],
    intermediateVars: [
      variable('Q_out', 'm³/s', '出口流量'),
      variable('dh_dt', 'm/s', '液位变化率'),
      variable('level_pct', '%', '液位百分比'),
    ],

    params: p,

    setParam(name: string, value: number) {
      if (name in p) (p as Record<string, number>)[name] = value
    },

    getInitialState() {
      return new Float64Array([0.8])
    },

    getDefaultInput() {
      return new Float64Array([0])
    },

    derivatives(_t: number, state: Float64Array, input: Float64Array) {
      const h = state[0]!
      const u = input[0]!
      return new Float64Array([
        (u - p.a * Math.sqrt(Math.max(h, 0))) / p.A,
      ])
    },

    output(_t: number, state: Float64Array) {
      return new Float64Array([state[0]!])
    },

    intermediates(_t: number, state: Float64Array, input: Float64Array) {
      const h = state[0]!
      const u = input[0]!
      const Q_out = p.a * Math.sqrt(Math.max(h, 0))
      const dh_dt = (u - Q_out) / p.A
      const level_pct = Math.max(h, 0) * 100
      return new Float64Array([Q_out, dh_dt, level_pct])
    },
  }
}

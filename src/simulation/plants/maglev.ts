import type { PlantModel } from './types'
import { variable } from './types'

/**
 * 磁悬浮系统
 *
 * 微分方程: dy/dt = v, dv/dt = g - k·i² / y²
 *
 * 状态: [y, v] — 高度、速度
 * 输入: [i] — 电流
 * 输出: [y] — 高度
 * 中间: [F_mag, F_grav, F_net, accel] — 磁力加速度、重力加速度、合力加速度、加速度
 */
export function createMaglev(params?: { g?: number; k?: number; y_eq?: number }): PlantModel {
  const p = {
    g: params?.g ?? 9.81,
    k: params?.k ?? 0.5,
    y_eq: params?.y_eq ?? 0.5,
  }

  return {
    id: 'maglev',
    name: '磁悬浮',
    description: '电磁铁悬浮球体，开环不稳定非线性系统',
    category: 'nonlinear',

    stateVars: [
      variable('y', 'm', '高度'),
      variable('v', 'm/s', '速度'),
    ],
    inputVars: [
      variable('i', 'A', '电流'),
    ],
    outputVars: [
      variable('y', 'm', '高度'),
    ],
    intermediateVars: [
      variable('F_mag', 'm/s²', '磁力加速度'),
      variable('F_grav', 'm/s²', '重力加速度'),
      variable('F_net', 'm/s²', '合力加速度'),
      variable('accel', 'm/s²', '加速度'),
    ],

    params: p,

    setParam(name: string, value: number) {
      if (name in p) (p as Record<string, number>)[name] = value
    },

    getInitialState() {
      return new Float64Array([0.7, 0.0]) // 起始位置在平衡点之上
    },

    getDefaultInput() {
      return new Float64Array([0])
    },

    derivatives(_t: number, state: Float64Array, input: Float64Array) {
      const y = state[0]!
      const v = state[1]!
      const ic = Math.max(input[0]!, 0)  // clamp non-negative
      const yc = Math.max(y, 1e-4)       // guard singularity
      return new Float64Array([
        v,
        p.g - p.k * ic * ic / (yc * yc),
      ])
    },

    output(_t: number, state: Float64Array) {
      return new Float64Array([state[0]!])
    },

    intermediates(_t: number, state: Float64Array, input: Float64Array) {
      const y = state[0]!
      const ic = Math.max(input[0]!, 0)
      const yc = Math.max(y, 1e-4)
      const F_mag = p.k * ic * ic / (yc * yc)
      const F_grav = p.g
      const F_net = F_grav - F_mag
      const accel = F_net
      return new Float64Array([F_mag, F_grav, F_net, accel])
    },
  }
}

import type { PlantModel } from './types'
import { variable } from './types'

/**
 * 球杆系统（Ball and Beam）
 *
 * 球在可倾斜梁上滚动，欠驱动非线性系统。
 *
 * 微分方程:
 *   dtheta/dt = omega
 *   domega/dt = tau / J_beam
 *   dx_b/dt = v_b
 *   dv_b/dt = (5/7) * (x_b * omega^2 - g * sin(theta))
 *
 * (5/7) 因子来自球无滑滚动（平动 + 转动动能）。
 *
 * 状态: [theta, omega, x_b, v_b] — 梁角度、梁角速度、球位置、球速度
 * 输入: [tau] — 梁力矩
 * 输出: [theta, x_b] — 梁角度、球位置
 * 中间: [a_ball, F_grav, F_centrifugal] — 球加速度、重力分量、离心分量
 */
export function createBallAndBeam(params?: {
  g?: number
  J_beam?: number
  L?: number
}): PlantModel {
  const p = {
    g: params?.g ?? 9.81,       // 重力加速度 (m/s²)
    J_beam: params?.J_beam ?? 0.5, // 梁转动惯量 (kg·m²)
    L: params?.L ?? 1.0,        // 梁半长 (m)
  }

  return {
    id: 'ball-and-beam',
    name: '球杆系统',
    description: '球在可倾斜梁上滚动，欠驱动非线性系统',
    category: 'nonlinear',

    stateVars: [
      variable('theta', 'rad', '梁角度'),
      variable('omega', 'rad/s', '梁角速度'),
      variable('x_b', 'm', '球位置'),
      variable('v_b', 'm/s', '球速度'),
    ],
    inputVars: [
      variable('tau', 'N·m', '梁力矩'),
    ],
    outputVars: [
      variable('theta', 'rad', '梁角度'),
      variable('x_b', 'm', '球位置'),
    ],
    intermediateVars: [
      variable('a_ball', 'm/s²', '球加速度'),
      variable('F_grav', 'm/s²', '重力分量'),
      variable('F_centrifugal', 'm/s²', '离心分量'),
    ],

    params: p,

    setParam(name: string, value: number) {
      if (name in p) (p as Record<string, number>)[name] = value
    },

    getInitialState() {
      return new Float64Array([0.0, 0.0, 0.5, 0.0]) // [theta, omega, x_b, v_b]
    },

    getDefaultInput() {
      return new Float64Array([0])
    },

    derivatives(_t: number, state: Float64Array, input: Float64Array) {
      const theta = state[0]!
      const omega = state[1]!
      const x_b = state[2]!
      const v_b = state[3]!
      const tau = input[0]!

      const sinT = Math.sin(theta)
      const a_ball = (5 / 7) * (x_b * omega * omega - p.g * sinT)

      return new Float64Array([
        omega,                  // dtheta/dt
        tau / p.J_beam,         // domega/dt
        v_b,                    // dx_b/dt
        a_ball,                 // dv_b/dt
      ])
    },

    output(_t: number, state: Float64Array) {
      return new Float64Array([state[0]!, state[2]!])
    },

    intermediates(_t: number, state: Float64Array) {
      const theta = state[0]!
      const omega = state[1]!
      const x_b = state[2]!

      const sinT = Math.sin(theta)
      const F_grav = -p.g * sinT
      const F_centrifugal = x_b * omega * omega
      const a_ball = (5 / 7) * (F_centrifugal + F_grav)

      return new Float64Array([a_ball, F_grav, F_centrifugal])
    },
  }
}

import type { PlantModel } from './types'
import { variable } from './types'

/**
 * 倒立摆（小车-摆杆系统）
 *
 * 非线性系统，状态空间建模。
 *
 * 状态: [x, v, θ, ω] — 小车位置、小车速度、摆杆角度、摆杆角速度
 * 输入: [F] — 作用在小车上的水平力
 * 输出: [x, θ] — 小车位置、摆杆角度
 * 中间: [accel_x, accel_theta, gravity_torque, centrifugal, F_effect] — 调试用
 */
export function createInvertedPendulum(params?: {
  M?: number
  m?: number
  l?: number
  g?: number
}): PlantModel {
  const p = {
    M: params?.M ?? 0.5,   // 小车质量 (kg)
    m: params?.m ?? 0.2,   // 摆杆质量 (kg)
    l: params?.l ?? 0.3,   // 摆杆半长 (m)
    g: params?.g ?? 9.81,  // 重力加速度 (m/s²)
  }

  return {
    id: 'inverted-pendulum',
    name: '倒立摆',
    description: '经典非线性控制问题，小车-摆杆系统',
    category: 'nonlinear',

    stateVars: [
      variable('x', 'm', '小车位置'),
      variable('v', 'm/s', '小车速度'),
      variable('θ', 'rad', '摆杆角度'),
      variable('ω', 'rad/s', '摆杆角速度'),
    ],
    inputVars: [
      variable('F', 'N', '水平力'),
    ],
    outputVars: [
      variable('x', 'm', '小车位置'),
      variable('θ', 'rad', '摆杆角度'),
    ],
    intermediateVars: [
      variable('accel_x', 'm/s²', '小车加速度'),
      variable('accel_θ', 'rad/s²', '摆杆角加速度'),
      variable('T_grav', 'N·m', '重力力矩'),
      variable('T_coriolis', 'N·m', '科氏力矩'),
      variable('F_eff', 'N', '有效驱动力'),
    ],

    params: p,

    setParam(name: string, value: number) {
      if (name in p) (p as Record<string, number>)[name] = value
    },

    getInitialState() {
      return new Float64Array([0, 0, 0.1, 0]) // 小偏角启动
    },

    getDefaultInput() {
      return new Float64Array([0])
    },

    derivatives(_t: number, state: Float64Array, input: Float64Array) {
      const v = state[1]!
      const theta = state[2]!
      const omega = state[3]!
      const F = input[0]!
      const { M, m, l, g } = p

      const sinT = Math.sin(theta)
      const cosT = Math.cos(theta)
      const mu = M + m - m * cosT * cosT

      const accel_x = (F - m * l * omega * omega * sinT + m * g * sinT * cosT) / mu
      const accel_theta = (g * sinT - cosT * (F - m * l * omega * omega * sinT) / (M + m))
        / (l - m * l * cosT * cosT / (M + m))

      return new Float64Array([v, accel_x, omega, accel_theta])
    },

    output(_t: number, state: Float64Array) {
      return new Float64Array([state[0]!, state[2]!])
    },

    intermediates(_t: number, state: Float64Array, input: Float64Array) {
      const theta = state[2]!
      const omega = state[3]!
      const F = input[0]!
      const { M, m, l, g } = p

      const sinT = Math.sin(theta)
      const cosT = Math.cos(theta)
      const mu = M + m - m * cosT * cosT

      const T_grav = m * g * l * sinT
      const T_coriolis = -m * l * l * omega * omega * sinT * cosT
      const F_eff = F - m * l * omega * omega * sinT + m * g * sinT * cosT
      const accel_x = F_eff / mu
      const accel_theta = (g * sinT - cosT * (F - m * l * omega * omega * sinT) / (M + m))
        / (l - m * l * cosT * cosT / (M + m))

      return new Float64Array([accel_x, accel_theta, T_grav, T_coriolis, F_eff])
    },
  }
}

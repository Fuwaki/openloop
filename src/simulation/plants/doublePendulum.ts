import type { PlantModel } from './types'
import { variable } from './types'

/**
 * 双摆系统
 *
 * 非线性系统，经典混沌动力学。
 *
 * 状态: [theta1, omega1, theta2, omega2] — 连杆1角度、连杆1角速度、连杆2角度、连杆2角速度
 * 输入: [tau] — 关节1力矩
 * 输出: [theta1, theta2] — 连杆1角度、连杆2角度
 * 中间: [KE, PE, E_total, alpha1, alpha2] — 动能、势能、总能量、角加速度
 *
 * 角度约定：从竖直向下测量，逆时针为正。重力向下（g > 0）。
 */
export function createDoublePendulum(params?: {
  m1?: number
  m2?: number
  l1?: number
  l2?: number
  b1?: number
  b2?: number
  g?: number
}): PlantModel {
  const p = {
    m1: params?.m1 ?? 1.0,   // 连杆1质量 (kg)
    m2: params?.m2 ?? 1.0,   // 连杆2质量 (kg)
    l1: params?.l1 ?? 1.0,   // 连杆1长度 (m)
    l2: params?.l2 ?? 1.0,   // 连杆2长度 (m)
    b1: params?.b1 ?? 0.01,  // 关节1阻尼 (N·m·s/rad)
    b2: params?.b2 ?? 0.01,  // 关节2阻尼 (N·m·s/rad)
    g: params?.g ?? 9.81,    // 重力加速度 (m/s²)
  }

  return {
    id: 'double-pendulum',
    name: '双摆',
    description: '双摆系统，经典混沌非线性动力学',
    category: 'nonlinear',

    stateVars: [
      variable('theta1', 'rad', '连杆1角度'),
      variable('omega1', 'rad/s', '连杆1角速度'),
      variable('theta2', 'rad', '连杆2角度'),
      variable('omega2', 'rad/s', '连杆2角速度'),
    ],
    inputVars: [
      variable('tau', 'N·m', '关节1力矩'),
    ],
    outputVars: [
      variable('theta1', 'rad', '连杆1角度'),
      variable('theta2', 'rad', '连杆2角度'),
    ],
    intermediateVars: [
      variable('KE', 'J', '动能'),
      variable('PE', 'J', '势能'),
      variable('E_total', 'J', '总能量'),
      variable('alpha1', 'rad/s²', '连杆1角加速度'),
      variable('alpha2', 'rad/s²', '连杆2角加速度'),
    ],

    params: p,

    setParam(name: string, value: number) {
      if (name in p) (p as Record<string, number>)[name] = value
    },

    getInitialState() {
      return new Float64Array([0.3, 0.0, 0.0, 0.0]) // 小偏角启动
    },

    getDefaultInput() {
      return new Float64Array([0])
    },

    derivatives(_t: number, state: Float64Array, input: Float64Array) {
      const theta1 = state[0]!
      const omega1 = state[1]!
      const theta2 = state[2]!
      const omega2 = state[3]!
      const tau = input[0]!
      const { m1, m2, l1, l2, b1, b2, g } = p

      const sinDiff = Math.sin(theta1 - theta2)
      const cosDiff = Math.cos(theta1 - theta2)

      // 质量矩阵
      const M11 = (m1 + m2) * l1 * l1
      const M12 = m2 * l1 * l2 * cosDiff
      const M21 = M12
      const M22 = m2 * l2 * l2

      // 广义力
      const G1 = -m2 * l1 * l2 * omega2 * omega2 * sinDiff
        - (m1 + m2) * g * l1 * Math.sin(theta1)
        - b1 * omega1 + tau

      const G2 = m2 * l1 * l2 * omega1 * omega1 * sinDiff
        - m2 * g * l2 * Math.sin(theta2)
        - b2 * omega2

      // Cramer's rule
      const det = M11 * M22 - M12 * M21
      if (Math.abs(det) < 1e-12) return new Float64Array([omega1, 0, omega2, 0])

      const alpha1 = (M22 * G1 - M12 * G2) / det
      const alpha2 = (M11 * G2 - M21 * G1) / det

      return new Float64Array([omega1, alpha1, omega2, alpha2])
    },

    output(_t: number, state: Float64Array) {
      return new Float64Array([state[0]!, state[2]!])
    },

    intermediates(_t: number, state: Float64Array, input: Float64Array) {
      const theta1 = state[0]!
      const omega1 = state[1]!
      const theta2 = state[2]!
      const omega2 = state[3]!
      const tau = input[0]!
      const { m1, m2, l1, l2, b1, b2, g } = p

      const sinDiff = Math.sin(theta1 - theta2)
      const cosDiff = Math.cos(theta1 - theta2)

      // 动能
      const KE = 0.5 * (m1 + m2) * l1 * l1 * omega1 * omega1
        + 0.5 * m2 * l2 * l2 * omega2 * omega2
        + m2 * l1 * l2 * omega1 * omega2 * cosDiff

      // 势能（从竖直向下测量，取负值）
      const PE = -(m1 + m2) * g * l1 * Math.cos(theta1)
        - m2 * g * l2 * Math.cos(theta2)

      const E_total = KE + PE

      // 角加速度（与 derivatives 相同的计算）
      const M11 = (m1 + m2) * l1 * l1
      const M12 = m2 * l1 * l2 * cosDiff
      const M21 = M12
      const M22 = m2 * l2 * l2

      const G1 = -m2 * l1 * l2 * omega2 * omega2 * sinDiff
        - (m1 + m2) * g * l1 * Math.sin(theta1)
        - b1 * omega1 + tau

      const G2 = m2 * l1 * l2 * omega1 * omega1 * sinDiff
        - m2 * g * l2 * Math.sin(theta2)
        - b2 * omega2

      const det = M11 * M22 - M12 * M21
      const alpha1 = Math.abs(det) < 1e-12 ? 0 : (M22 * G1 - M12 * G2) / det
      const alpha2 = Math.abs(det) < 1e-12 ? 0 : (M11 * G2 - M21 * G1) / det

      return new Float64Array([KE, PE, E_total, alpha1, alpha2])
    },
  }
}

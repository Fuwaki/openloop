import type { PlantModel } from './types'
import { variable } from './types'

/**
 * 直流电机模型
 *
 * 电气-机械耦合系统:
 *   dtheta/dt = omega
 *   domega/dt = (Kt*i - b*omega) / J
 *   di/dt     = (V - R*i - Ke*omega) / L
 *
 * 状态: [theta, omega, i] — 转角、角速度、电流
 * 输入: [V] — 电压
 * 输出: [theta, omega] — 转角、角速度
 * 中间: [T_motor, V_bemf, accel, power] — 电机转矩、反电动势、角加速度、电磁功率
 */
export function createDcMotor(params?: { J?: number; b?: number; Kt?: number; Ke?: number; R?: number; L?: number }): PlantModel {
  const p = {
    J: params?.J ?? 0.01,
    b: params?.b ?? 0.1,
    Kt: params?.Kt ?? 0.01,
    Ke: params?.Ke ?? 0.01,
    R: params?.R ?? 1,
    L: params?.L ?? 0.5,
  }

  return {
    id: 'dc-motor',
    name: '直流电机',
    description: '直流电机模型，电气-机械耦合系统',
    category: 'linear',

    stateVars: [
      variable('theta', 'rad', '转角'),
      variable('omega', 'rad/s', '角速度'),
      variable('i', 'A', '电流'),
    ],
    inputVars: [
      variable('V', 'V', '电压'),
    ],
    outputVars: [
      variable('theta', 'rad', '转角'),
      variable('omega', 'rad/s', '角速度'),
    ],
    intermediateVars: [
      variable('T_motor', 'N·m', '电机转矩'),
      variable('V_bemf', 'V', '反电动势'),
      variable('accel', 'rad/s²', '角加速度'),
      variable('power', 'W', '电磁功率'),
    ],

    params: p,

    setParam(name: string, value: number) {
      if (name in p) (p as Record<string, number>)[name] = value
    },

    getInitialState() {
      return new Float64Array([1.0, 0.0, 0.0])
    },

    getDefaultInput() {
      return new Float64Array([0])
    },

    derivatives(_t: number, state: Float64Array, input: Float64Array) {
      const _theta = state[0]!
      const omega = state[1]!
      const i = state[2]!
      const V = input[0]!
      return new Float64Array([
        omega,
        (p.Kt * i - p.b * omega) / p.J,
        (V - p.R * i - p.Ke * omega) / p.L,
      ])
    },

    output(_t: number, state: Float64Array) {
      return new Float64Array([state[0]!, state[1]!])
    },

    intermediates(_t: number, state: Float64Array, input: Float64Array) {
      const omega = state[1]!
      const i = state[2]!
      const V = input[0]!
      const T_motor = p.Kt * i
      const V_bemf = p.Ke * omega
      const accel = (p.Kt * i - p.b * omega) / p.J
      const power = V * i
      return new Float64Array([T_motor, V_bemf, accel, power])
    },
  }
}

import type { PlantModel } from './types'
import { variable } from './types'

/**
 * 质量-弹簧-阻尼系统
 *
 * 微分方程: mẍ + cẋ + kx = F
 * 一阶形式: dx/dt = v, dv/dt = (F - c·v - k·x) / m
 *
 * 状态: [x, v] — 位置、速度
 * 输入: [F] — 外力
 * 输出: [x, v] — 位置、速度
 * 中间: [F_spring, F_damp, accel, KE, PE] — 弹簧力、阻尼力、加速度、动能、势能
 */
export function createMassSpring(params?: { m?: number; c?: number; k?: number }): PlantModel {
  const p = {
    m: params?.m ?? 1,
    c: params?.c ?? 0.5,
    k: params?.k ?? 2,
  }

  return {
    id: 'mass-spring-damper',
    name: '质量-弹簧-阻尼',
    description: '经典二阶系统 mẍ + cẋ + kx = F',
    category: 'linear',

    stateVars: [
      variable('x', 'm', '位置'),
      variable('v', 'm/s', '速度'),
    ],
    inputVars: [
      variable('F', 'N', '外力'),
    ],
    outputVars: [
      variable('x', 'm', '位置'),
      variable('v', 'm/s', '速度'),
    ],
    intermediateVars: [
      variable('F_spring', 'N', '弹簧力'),
      variable('F_damp', 'N', '阻尼力'),
      variable('accel', 'm/s²', '加速度'),
      variable('KE', 'J', '动能'),
      variable('PE', 'J', '势能'),
    ],

    params: p,

    setParam(name: string, value: number) {
      if (name in p) (p as Record<string, number>)[name] = value
    },

    getInitialState() {
      return new Float64Array([0.35, 0]) // 初始位移 0.35m
    },

    getDefaultInput() {
      return new Float64Array([0])
    },

    derivatives(_t: number, state: Float64Array, input: Float64Array) {
      const x = state[0]!
      const v = state[1]!
      const F = input[0]!
      return new Float64Array([
        v,
        (F - p.c * v - p.k * x) / p.m,
      ])
    },

    output(_t: number, state: Float64Array) {
      return new Float64Array([state[0]!, state[1]!])
    },

    intermediates(_t: number, state: Float64Array, input: Float64Array) {
      const x = state[0]!
      const v = state[1]!
      const F = input[0]!
      const F_spring = -p.k * x
      const F_damp = -p.c * v
      const accel = (F + F_spring + F_damp) / p.m
      const KE = 0.5 * p.m * v * v
      const PE = 0.5 * p.k * x * x
      return new Float64Array([F_spring, F_damp, accel, KE, PE])
    },
  }
}

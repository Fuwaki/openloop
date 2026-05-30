import { describe, expect, it } from 'vitest'
import { generateControllerCode } from '../useCodeGenerator'
import { getControllerVariant, matchControllerVariant } from '@/models/controller-table'
import { getModelEntry } from '@/models/model-table'

describe('useCodeGenerator', () => {
  it('倒立摆 PD 使用摆角目标而不是小车位置目标', () => {
    const model = getModelEntry('inverted-pendulum')!
    const selection = getControllerVariant('pd', 'pd-second-order')!

    const code = generateControllerCode(model, selection.variant)

    expect(code).toContain('默认控制目标: 摆杆直立')
    expect(code).toContain('q = theta')
    expect(code).toContain('q_dot = omega')
    expect(code).toContain('input_gain_sign = -1')
    expect(code).toContain('virtual_u = Kp * e + Kd * e_dot')
    expect(code).toContain('F = input_gain_sign * virtual_u')
    expect(code).not.toContain('q = x')
  })

  it('质量弹簧控制输入方向为正', () => {
    const model = getModelEntry('mass-spring-damper')!
    const selection = getControllerVariant('pd', 'pd-second-order')!

    const code = generateControllerCode(model, selection.variant)

    expect(code).toContain('q = x')
    expect(code).toContain('q_dot = v')
    expect(code).toContain('input_gain_sign = 1')
  })

  it('一阶系统禁用二阶 PD 变种', () => {
    const model = getModelEntry('first-order')!
    const selection = getControllerVariant('pd', 'pd-second-order')!

    const match = matchControllerVariant(model, selection.variant)

    expect(match.compatible).toBe(false)
    expect(match.reason).toContain('需要 2 阶目标链')
  })

  it('倒立摆可用二阶滑模变种', () => {
    const model = getModelEntry('inverted-pendulum')!
    const selection = getControllerVariant('sliding-mode', 'sliding-second-order')!

    const match = matchControllerVariant(model, selection.variant)

    expect(match.compatible).toBe(true)
  })
})

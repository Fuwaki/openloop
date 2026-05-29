import { describe, it, expect } from 'vitest'
import { createFirstOrder } from '../firstOrder'

describe('createFirstOrder', () => {
  it('默认参数正确', () => {
    const plant = createFirstOrder()
    expect(plant.id).toBe('first-order')
    expect(plant.params.tau).toBe(1.0)
    expect(plant.params.K).toBe(1.0)
  })

  it('自定义参数', () => {
    const plant = createFirstOrder({ tau: 2.0, K: 3.0 })
    expect(plant.params.tau).toBe(2.0)
    expect(plant.params.K).toBe(3.0)
  })

  it('初始状态为 [0]', () => {
    const plant = createFirstOrder()
    const s = plant.getInitialState()
    expect(s.length).toBe(1)
    expect(s[0]).toBe(0)
  })

  it('默认输入为 [1]', () => {
    const plant = createFirstOrder()
    const u = plant.getDefaultInput()
    expect(u.length).toBe(1)
    expect(u[0]).toBe(1)
  })

  it('derivatives: dx/dt = (K·u - x) / τ', () => {
    const plant = createFirstOrder({ tau: 2.0, K: 3.0 })
    const dx = plant.derivatives(0, new Float64Array([1]), new Float64Array([2]))
    // (3*2 - 1) / 2 = 2.5
    expect(dx[0]).toBeCloseTo(2.5)
  })

  it('derivatives: 稳态时 dx/dt = 0', () => {
    const plant = createFirstOrder({ tau: 1.0, K: 2.0 })
    // 稳态: x = K*u = 2*1 = 2
    const dx = plant.derivatives(0, new Float64Array([2]), new Float64Array([1]))
    expect(dx[0]).toBeCloseTo(0)
  })

  it('intermediates 正确', () => {
    const plant = createFirstOrder({ tau: 1.0, K: 2.0 })
    const m = plant.intermediates(0, new Float64Array([0.5]), new Float64Array([1]))
    expect(m[0]).toBeCloseTo(1.5) // dx = (2*1 - 0.5) / 1 = 1.5
    expect(m[1]).toBeCloseTo(1.5) // e = 2*1 - 0.5 = 1.5
    expect(m[2]).toBeCloseTo(2.0) // x_ss = 2*1 = 2
  })

  it('阶跃响应趋近 K·u', () => {
    const plant = createFirstOrder({ tau: 1.0, K: 2.0 })
    const dt = 0.01
    let state = plant.getInitialState()
    const input = plant.getDefaultInput()

    // 简单欧拉积分 5 秒
    for (let i = 0; i < 500; i++) {
      const dx = plant.derivatives(i * dt, state, input)
      state = new Float64Array([state[0]! + dx[0]! * dt])
    }

    // 5τ 后应接近稳态 K*u = 2
    expect(state[0]).toBeGreaterThan(1.9)
    expect(state[0]).toBeLessThan(2.01)
  })
})

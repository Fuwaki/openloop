import { describe, it, expect } from 'vitest'
import { createInvertedPendulum } from '../invertedPendulum'
import { rk4Solver } from '../../solvers/rk4'

describe('createInvertedPendulum', () => {
  it('基本属性正确', () => {
    const plant = createInvertedPendulum()
    expect(plant.id).toBe('inverted-pendulum')
    expect(plant.category).toBe('nonlinear')
    expect(plant.stateVars).toHaveLength(4)
    expect(plant.inputVars).toHaveLength(1)
    expect(plant.outputVars).toHaveLength(2)
    expect(plant.intermediateVars).toHaveLength(5)
  })

  it('参数默认值正确', () => {
    const plant = createInvertedPendulum()
    expect(plant.params.M).toBe(0.5)
    expect(plant.params.m).toBe(0.2)
    expect(plant.params.l).toBe(0.3)
    expect(plant.params.g).toBe(9.81)
  })

  it('output 返回 [x, θ]', () => {
    const plant = createInvertedPendulum()
    const state = new Float64Array([1, 2, 0.5, 3])
    const out = plant.output(0, state, new Float64Array([0]))
    expect(out).toEqual(new Float64Array([1, 0.5]))
  })

  it('直立平衡态：θ=0, F=0 时 derivatives 应为零', () => {
    const plant = createInvertedPendulum()
    const state = new Float64Array([0, 0, 0, 0]) // 直立静止
    const dx = plant.derivatives(0, state, new Float64Array([0]))

    // v = 0 → dx[0] = 0
    expect(dx[0]).toBeCloseTo(0)
    // 无外力无偏角 → 小车加速度 = 0
    expect(dx[1]).toBeCloseTo(0)
    // ω = 0 → dx[2] = 0
    expect(dx[2]).toBeCloseTo(0)
    // θ=0, F=0 → 角加速度 = 0
    expect(dx[3]).toBeCloseTo(0)
  })

  it('小角度线性化：自由倒立摆不稳定（θ 增大）', () => {
    const plant = createInvertedPendulum()
    // 微小偏角，无控制力
    let state = new Float64Array([0, 0, 0.01, 0])
    const dt = 0.001

    // 跑一小段时间，角度应该增大（不稳定）
    for (let i = 0; i < 100; i++) {
      state = rk4Solver.step(plant, 0, state, new Float64Array([0]), dt)
    }

    // θ 应该增大（不稳定平衡）
    expect(Math.abs(state[2])).toBeGreaterThan(0.01)
  })

  it('大角度自由下落：摆杆倒向一侧', () => {
    const plant = createInvertedPendulum()
    let state = new Float64Array([0, 0, 0.5, 0]) // 初始偏角 ~28°
    const dt = 0.001

    for (let i = 0; i < 2000; i++) { // 2 秒
      state = rk4Solver.step(plant, 0, state, new Float64Array([0]), dt)
    }

    // 摆杆应该倒向一侧（θ 增大）
    expect(Math.abs(state[2])).toBeGreaterThan(0.5)
  })

  it('intermediates 返回合理的中间变量', () => {
    const plant = createInvertedPendulum()
    const state = new Float64Array([0, 0, 0.1, 0])
    const input = new Float64Array([1]) // F=1N
    const inter = plant.intermediates(0, state, input)

    // 重力力矩 = m*g*l*sin(θ)，θ>0 时为正
    expect(inter[2]).toBeGreaterThan(0)
    // 有效驱动力应存在
    expect(inter[4]).not.toBe(0)
    // 所有中间变量应为有限数
    for (let i = 0; i < inter.length; i++) {
      expect(Number.isFinite(inter[i])).toBe(true)
    }
  })
})

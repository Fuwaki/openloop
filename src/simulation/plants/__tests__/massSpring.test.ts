import { describe, it, expect } from 'vitest'
import { createMassSpring } from '../massSpring'
import { rk4Solver } from '../../solvers/rk4'

describe('createMassSpring', () => {
  it('基本属性正确', () => {
    const plant = createMassSpring()
    expect(plant.id).toBe('mass-spring-damper')
    expect(plant.category).toBe('linear')
    expect(plant.stateVars).toHaveLength(2)
    expect(plant.inputVars).toHaveLength(1)
    expect(plant.outputVars).toHaveLength(2)
    expect(plant.intermediateVars).toHaveLength(5)
  })

  it('参数默认值正确', () => {
    const plant = createMassSpring()
    expect(plant.params.m).toBe(1)
    expect(plant.params.c).toBe(0.5)
    expect(plant.params.k).toBe(2)
  })

  it('自定义参数生效', () => {
    const plant = createMassSpring({ m: 3, c: 1, k: 5 })
    expect(plant.params.m).toBe(3)
    expect(plant.params.c).toBe(1)
    expect(plant.params.k).toBe(5)
  })

  it('setParam 修改参数', () => {
    const plant = createMassSpring()
    plant.setParam('m', 10)
    expect(plant.params.m).toBe(10)
    // 不存在的参数不报错
    plant.setParam('nonexistent', 999)
  })

  it('初始状态和默认输入', () => {
    const plant = createMassSpring()
    const s0 = plant.getInitialState()
    const u0 = plant.getDefaultInput()
    expect(s0).toEqual(new Float64Array([0.35, 0]))
    expect(u0).toEqual(new Float64Array([0]))
  })

  it('output 返回 [x, v]', () => {
    const plant = createMassSpring()
    const state = new Float64Array([1.5, 2.5])
    const out = plant.output(0, state, new Float64Array([0]))
    expect(out).toEqual(new Float64Array([1.5, 2.5]))
  })

  it('静止平衡态：无外力时 derivatives 为零', () => {
    const plant = createMassSpring()
    const state = new Float64Array([0, 0]) // x=0, v=0
    const dx = plant.derivatives(0, state, new Float64Array([0]))
    expect(dx[0]).toBeCloseTo(0) // v = 0
    expect(dx[1]).toBeCloseTo(0) // a = (0 - 0 - 0)/m = 0
  })

  it('纯弹簧力方向正确：正位移产生负加速度', () => {
    const plant = createMassSpring({ m: 1, c: 0, k: 1 })
    const state = new Float64Array([1, 0]) // x=1, v=0
    const dx = plant.derivatives(0, state, new Float64Array([0]))
    expect(dx[0]).toBeCloseTo(0)  // v = 0
    expect(dx[1]).toBeCloseTo(-1) // a = -k*x/m = -1
  })

  it('阻尼力方向正确：正速度产生负加速度', () => {
    const plant = createMassSpring({ m: 1, c: 1, k: 0 })
    const state = new Float64Array([0, 2]) // x=0, v=2
    const dx = plant.derivatives(0, state, new Float64Array([0]))
    expect(dx[0]).toBeCloseTo(2)  // v = 2
    expect(dx[1]).toBeCloseTo(-2) // a = -c*v/m = -2
  })

  it('无阻尼系统能量守恒', () => {
    const plant = createMassSpring({ m: 1, c: 0, k: 1 })
    const dt = 0.001
    const steps = 10000

    let state = new Float64Array([1, 0]) // x=1, v=0
    const E0 = 0.5 // KE=0 + PE=0.5*k*x²=0.5

    for (let i = 0; i < steps; i++) {
      state = rk4Solver.step(plant, 0, state, new Float64Array([0]), dt)
    }

    const KE = 0.5 * plant.params.m * state[1] * state[1]
    const PE = 0.5 * plant.params.k * state[0] * state[0]
    const E = KE + PE
    // RK4 能量守恒精度很高
    expect(Math.abs(E - E0)).toBeLessThan(1e-8)
  })

  it('intermediates 返回正确的中间变量', () => {
    const plant = createMassSpring({ m: 2, c: 1, k: 4 })
    const state = new Float64Array([0.5, 1]) // x=0.5, v=1
    const input = new Float64Array([3])      // F=3
    const inter = plant.intermediates(0, state, input)

    // F_spring = -k*x = -4*0.5 = -2
    expect(inter[0]).toBeCloseTo(-2)
    // F_damp = -c*v = -1*1 = -1
    expect(inter[1]).toBeCloseTo(-1)
    // accel = (F + F_spring + F_damp) / m = (3 - 2 - 1) / 2 = 0
    expect(inter[2]).toBeCloseTo(0)
    // KE = 0.5*m*v² = 0.5*2*1 = 1
    expect(inter[3]).toBeCloseTo(1)
    // PE = 0.5*k*x² = 0.5*4*0.25 = 0.5
    expect(inter[4]).toBeCloseTo(0.5)
  })
})

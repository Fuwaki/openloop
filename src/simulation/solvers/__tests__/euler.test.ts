import { describe, it, expect } from 'vitest'
import { eulerSolver } from '../euler'
import type { SystemModel } from '../../types'

// ── 测试模型：指数衰减 dx/dt = -kx，解析解 x(t) = x0 * e^(-kt) ──

const decayModel = (k: number): SystemModel => ({
  derivatives(_t, state) {
    return new Float64Array([-k * state[0]])
  },
})

// ── 测试模型：简谐振动 d²x/dt² = -ω²x → 状态 [x, v] ──
// 解析解: x(t) = x0·cos(ωt) + (v0/ω)·sin(ωt)

const harmonicModel = (omega: number): SystemModel => ({
  derivatives(_t, state) {
    return new Float64Array([state[1], -omega * omega * state[0]])
  },
})

describe('eulerSolver', () => {
  it('接口存在且 step 方法可调用', () => {
    const model = decayModel(1)
    const state = new Float64Array([1])
    const result = eulerSolver.step(model, 0, state, new Float64Array([0]), 0.01)
    expect(result).toBeInstanceOf(Float64Array)
    expect(result.length).toBe(1)
  })

  it('指数衰减：单步方向正确', () => {
    const model = decayModel(1)
    const x0 = new Float64Array([1])
    const result = eulerSolver.step(model, 0, x0, new Float64Array([0]), 0.1)
    // x 应该减小（衰减）
    expect(result[0]).toBeLessThan(1)
    expect(result[0]).toBeGreaterThan(0)
  })

  it('指数衰减：多步仿真收敛到解析解', () => {
    const k = 0.5
    const model = decayModel(k)
    const dt = 0.001
    const steps = 1000 // t = 0 → 1s

    let state = new Float64Array([2])
    let t = 0
    for (let i = 0; i < steps; i++) {
      state = eulerSolver.step(model, t, state, new Float64Array([0]), dt)
      t += dt
    }

    // 解析解: x(1) = 2 * e^(-0.5) ≈ 1.2131
    const analytical = 2 * Math.exp(-k * 1)
    const error = Math.abs(state[0] - analytical)
    // Euler 一阶，dt=0.001 误差量级 ~1e-3
    expect(error).toBeLessThan(0.01)
  })

  it('简谐振动：能量守恒近似', () => {
    const omega = 2 * Math.PI // 1Hz
    const model = harmonicModel(omega)
    const dt = 0.0005
    const steps = 20000 // 10 秒

    let state = new Float64Array([1, 0]) // x0=1, v0=0
    let t = 0
    for (let i = 0; i < steps; i++) {
      state = eulerSolver.step(model, t, state, new Float64Array([0]), dt)
      t += dt
    }

    // 解析解: x(10) = cos(2π·10) = 1, v = 0
    // Euler 有数值耗散，振幅会略微衰减，但应该在合理范围内
    const analytical_x = Math.cos(omega * 10)
    const analytical_v = -omega * Math.sin(omega * 10)
    const error_x = Math.abs(state[0] - analytical_x)
    const error_v = Math.abs(state[1] - analytical_v)
    expect(error_x).toBeLessThan(0.5)
    expect(error_v).toBeLessThan(5)
  })

  it('一阶精度验证：步长减半误差约减半', () => {
    const k = 1
    const model = decayModel(k)
    const T = 1
    const x0 = new Float64Array([1])
    const analytical = Math.exp(-k * T)

    // dt = 0.01
    let state1 = new Float64Array(x0)
    for (let i = 0; i < T / 0.01; i++) {
      state1 = eulerSolver.step(model, i * 0.01, state1, new Float64Array([0]), 0.01)
    }

    // dt = 0.005
    let state2 = new Float64Array(x0)
    for (let i = 0; i < T / 0.005; i++) {
      state2 = eulerSolver.step(model, i * 0.005, state2, new Float64Array([0]), 0.005)
    }

    const err1 = Math.abs(state1[0] - analytical)
    const err2 = Math.abs(state2[0] - analytical)
    // Euler 一阶：步长减半，误差约减半 (比值 ≈ 2)
    expect(err1).toBeGreaterThan(0)
    const ratio = err1 / err2
    expect(ratio).toBeGreaterThan(1.5)
    expect(ratio).toBeLessThan(2.5)
  })

  it('外部输入 (u) 正确传入模型', () => {
    // dx/dt = u（常数输入）
    const model: SystemModel = {
      derivatives(_t, _state, input) {
        return new Float64Array([input[0]])
      },
    }

    let state = new Float64Array([0])
    for (let i = 0; i < 100; i++) {
      state = eulerSolver.step(model, 0, state, new Float64Array([2]), 0.01)
    }
    // x(1) = 0 + 2*1 = 2
    expect(state[0]).toBeCloseTo(2, 1)
  })
})

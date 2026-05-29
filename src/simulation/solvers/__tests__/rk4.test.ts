import { describe, it, expect } from 'vitest'
import { rk4Solver } from '../rk4'
import type { SystemModel } from '../../types'

// ── 测试模型：指数衰减 dx/dt = -kx，解析解 x(t) = x0 * e^(-kt) ──

const decayModel = (k: number): SystemModel => ({
  derivatives(_t, state) {
    return new Float64Array([-k * state[0]])
  },
})

// ── 测试模型：简谐振动 d²x/dt² = -ω²x → 状态 [x, v] ──

const harmonicModel = (omega: number): SystemModel => ({
  derivatives(_t, state) {
    return new Float64Array([state[1], -omega * omega * state[0]])
  },
})

describe('rk4Solver', () => {
  it('接口存在且 step 方法可调用', () => {
    const model = decayModel(1)
    const state = new Float64Array([1])
    const result = rk4Solver.step(model, 0, state, new Float64Array([0]), 0.01)
    expect(result).toBeInstanceOf(Float64Array)
    expect(result.length).toBe(1)
  })

  it('指数衰减：多步仿真精确吻合解析解', () => {
    const k = 0.5
    const model = decayModel(k)
    const dt = 0.01
    const steps = 100 // t = 0 → 1s

    let state = new Float64Array([2])
    let t = 0
    for (let i = 0; i < steps; i++) {
      state = rk4Solver.step(model, t, state, new Float64Array([0]), dt)
      t += dt
    }

    // 解析解: x(1) = 2 * e^(-0.5) ≈ 1.2131
    const analytical = 2 * Math.exp(-k * 1)
    const error = Math.abs(state[0] - analytical)
    // RK4 四阶，dt=0.01 误差量级 ~1e-8
    expect(error).toBeLessThan(1e-6)
  })

  it('简谐振动：10 秒后振幅几乎无损', () => {
    const omega = 2 * Math.PI // 1Hz
    const model = harmonicModel(omega)
    const dt = 0.001
    const steps = 10000 // 10 秒

    let state = new Float64Array([1, 0]) // x0=1, v0=0
    let t = 0
    for (let i = 0; i < steps; i++) {
      state = rk4Solver.step(model, t, state, new Float64Array([0]), dt)
      t += dt
    }

    // 解析解: x(10) = cos(2π·10) = 1, v(10) = -ω·sin(2π·10) = 0
    const analytical_x = Math.cos(omega * 10)
    const analytical_v = -omega * Math.sin(omega * 10)
    const error_x = Math.abs(state[0] - analytical_x)
    const error_v = Math.abs(state[1] - analytical_v)
    // RK4 精度远优于 Euler，误差极小
    expect(error_x).toBeLessThan(1e-6)
    expect(error_v).toBeLessThan(1e-4)
  })

  it('四阶精度验证：步长减半误差约减 16 倍', () => {
    const k = 1
    const model = decayModel(k)
    const T = 1
    const x0 = new Float64Array([1])
    const analytical = Math.exp(-k * T)

    // dt = 0.1
    let state1 = new Float64Array(x0)
    for (let i = 0; i < T / 0.1; i++) {
      state1 = rk4Solver.step(model, i * 0.1, state1, new Float64Array([0]), 0.1)
    }

    // dt = 0.05
    let state2 = new Float64Array(x0)
    for (let i = 0; i < T / 0.05; i++) {
      state2 = rk4Solver.step(model, i * 0.05, state2, new Float64Array([0]), 0.05)
    }

    const err1 = Math.abs(state1[0] - analytical)
    const err2 = Math.abs(state2[0] - analytical)
    // RK4 四阶：步长减半，误差约减 2^4 = 16 倍
    expect(err1).toBeGreaterThan(0)
    const ratio = err1 / err2
    expect(ratio).toBeGreaterThan(10)
    expect(ratio).toBeLessThan(20)
  })

  it('比 Euler 精度高得多（同步长对比）', () => {
    const k = 1
    const model = decayModel(k)
    const T = 1
    const dt = 0.01
    const analytical = Math.exp(-k * T)

    // Euler
    const eulerState = new Float64Array([1])
    for (let i = 0; i < T / dt; i++) {
      eulerState[0] = eulerState[0] + (-k * eulerState[0]) * dt
    }

    // RK4
    let rk4State = new Float64Array([1])
    let t = 0
    for (let i = 0; i < T / dt; i++) {
      rk4State = rk4Solver.step(model, t, rk4State, new Float64Array([0]), dt)
      t += dt
    }

    const eulerErr = Math.abs(eulerState[0] - analytical)
    const rk4Err = Math.abs(rk4State[0] - analytical)
    // RK4 误差应该比 Euler 小好几个数量级
    expect(rk4Err).toBeLessThan(eulerErr / 100)
  })

  it('外部输入 (u) 正确传入模型', () => {
    // dx/dt = u（常数输入）
    const model: SystemModel = {
      derivatives(_t, _state, input) {
        return new Float64Array([input[0]])
      },
    }

    let state = new Float64Array([0])
    let t = 0
    for (let i = 0; i < 100; i++) {
      state = rk4Solver.step(model, t, state, new Float64Array([3]), 0.01)
      t += 0.01
    }
    // x(1) = 0 + 3*1 = 3
    expect(state[0]).toBeCloseTo(3, 4)
  })
})

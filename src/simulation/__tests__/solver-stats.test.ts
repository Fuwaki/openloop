import { describe, it, expect } from 'vitest'
import { createMeasuredSolver } from '../solver-stats'
import { eulerSolver } from '../solvers/euler'
import { rk4Solver } from '../solvers/rk4'
import type { SystemModel } from '../types'

const decayModel: SystemModel = {
  derivatives(_t, state) {
    return new Float64Array([-state[0]!])
  },
}

describe('createMeasuredSolver', () => {
  it('初始统计为零', () => {
    const { stats } = createMeasuredSolver(eulerSolver, 'euler')
    expect(stats.solverId).toBe('euler')
    expect(stats.stepCount).toBe(0)
    expect(stats.simTime).toBe(0)
    expect(stats.wallTimeTotal).toBe(0)
    expect(stats.wallTimeLastStep).toBe(0)
    expect(stats.wallTimeAvg).toBe(0)
    expect(stats.stepsPerSecond).toBe(0)
  })

  it('stepCount 正确递增', () => {
    const { step, stats } = createMeasuredSolver(eulerSolver, 'euler')
    let state = new Float64Array([1])
    for (let i = 0; i < 10; i++) {
      state = step(decayModel, i * 0.01, state, new Float64Array([0]), 0.01)
    }
    expect(stats.stepCount).toBe(10)
  })

  it('simTime 正确累加', () => {
    const { step, stats } = createMeasuredSolver(eulerSolver, 'euler')
    let state = new Float64Array([1])
    const dt = 0.01
    for (let i = 0; i < 100; i++) {
      state = step(decayModel, i * dt, state, new Float64Array([0]), dt)
    }
    expect(stats.simTime).toBeCloseTo(1, 10)
  })

  it('wallTimeLastStep > 0', () => {
    const { step, stats } = createMeasuredSolver(eulerSolver, 'euler')
    const state = new Float64Array([1])
    step(decayModel, 0, state, new Float64Array([0]), 0.01)
    expect(stats.wallTimeLastStep).toBeGreaterThan(0)
  })

  it('wallTimeAvg 和 wallTimeTotal 一致（单步）', () => {
    const { step, stats } = createMeasuredSolver(eulerSolver, 'euler')
    const state = new Float64Array([1])
    step(decayModel, 0, state, new Float64Array([0]), 0.01)
    expect(stats.wallTimeAvg).toBeCloseTo(stats.wallTimeTotal, 10)
  })

  it('stepsPerSecond 在合理范围内', () => {
    const { step, stats } = createMeasuredSolver(rk4Solver, 'rk4')
    let state = new Float64Array([1])
    for (let i = 0; i < 100; i++) {
      state = step(decayModel, i * 0.01, state, new Float64Array([0]), 0.01)
    }
    expect(stats.stepsPerSecond).toBeGreaterThan(100)
  })

  it('reset 清零所有统计', () => {
    const { step, stats, reset } = createMeasuredSolver(eulerSolver, 'euler')
    let state = new Float64Array([1])
    for (let i = 0; i < 50; i++) {
      state = step(decayModel, i * 0.01, state, new Float64Array([0]), 0.01)
    }
    expect(stats.stepCount).toBe(50)

    reset()
    expect(stats.stepCount).toBe(0)
    expect(stats.simTime).toBe(0)
    expect(stats.wallTimeTotal).toBe(0)
    expect(stats.wallTimeLastStep).toBe(0)
    expect(stats.wallTimeAvg).toBe(0)
    expect(stats.stepsPerSecond).toBe(0)
  })

  it('求解结果与原始求解器一致', () => {
    const measured = createMeasuredSolver(rk4Solver, 'rk4')
    let measuredState = new Float64Array([2])
    let rawState = new Float64Array([2])
    const dt = 0.01

    for (let i = 0; i < 100; i++) {
      const t = i * dt
      measuredState = measured.step(decayModel, t, measuredState, new Float64Array([0]), dt)
      rawState = rk4Solver.step(decayModel, t, rawState, new Float64Array([0]), dt)
    }

    expect(measuredState[0]).toBeCloseTo(rawState[0]!, 15)
  })

  it('滑动窗口不溢出（大量步数后 stepsPerSecond 仍合理）', () => {
    const { step, stats } = createMeasuredSolver(eulerSolver, 'euler')
    let state = new Float64Array([1])
    for (let i = 0; i < 1000; i++) {
      state = step(decayModel, i * 0.001, state, new Float64Array([0]), 0.001)
    }
    expect(stats.stepsPerSecond).toBeGreaterThan(0)
    expect(Number.isFinite(stats.stepsPerSecond)).toBe(true)
  })
})

import type { ODESolver, SystemModel } from '../types'

/**
 * 前向欧拉法 (Forward Euler)
 *
 * 最简单的显式单步法：x_{n+1} = x_n + dt * f(t, x, u)
 * 一阶精度，每步 1 次函数求值。
 * 稳定性较差，适合快速原型验证。
 */
export const eulerSolver: ODESolver = {
  step(
    model: SystemModel,
    t: number,
    state: Float64Array,
    input: Float64Array,
    dt: number,
  ): Float64Array {
    const dx = model.derivatives(t, state, input)
    const next = new Float64Array(state.length)
    for (let i = 0; i < state.length; i++) {
      next[i] = state[i]! + dx[i]! * dt
    }
    return next
  },
}

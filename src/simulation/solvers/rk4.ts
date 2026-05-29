import type { ODESolver, SystemModel } from '../types'

/**
 * 四阶 Runge-Kutta 法 (RK4)
 *
 * 经典显式单步法，四阶精度，每步 4 次函数求值。
 * 精度和稳定性远优于 Euler，是通用仿真首选。
 */
export const rk4Solver: ODESolver = {
  step(
    model: SystemModel,
    t: number,
    state: Float64Array,
    input: Float64Array,
    dt: number,
  ): Float64Array {
    const n = state.length

    // k1 = f(t, x, u)
    const k1 = model.derivatives(t, state, input)

    // k2 = f(t + dt/2, x + dt/2 * k1, u)
    const x2 = new Float64Array(n)
    for (let i = 0; i < n; i++) x2[i] = state[i]! + k1[i]! * dt * 0.5
    const k2 = model.derivatives(t + dt * 0.5, x2, input)

    // k3 = f(t + dt/2, x + dt/2 * k2, u)
    const x3 = new Float64Array(n)
    for (let i = 0; i < n; i++) x3[i] = state[i]! + k2[i]! * dt * 0.5
    const k3 = model.derivatives(t + dt * 0.5, x3, input)

    // k4 = f(t + dt, x + dt * k3, u)
    const x4 = new Float64Array(n)
    for (let i = 0; i < n; i++) x4[i] = state[i]! + k3[i]! * dt
    const k4 = model.derivatives(t + dt, x4, input)

    // x_{n+1} = x_n + dt/6 * (k1 + 2*k2 + 2*k3 + k4)
    const next = new Float64Array(n)
    for (let i = 0; i < n; i++) {
      next[i] = state[i]! + (dt / 6) * (k1[i]! + 2 * k2[i]! + 2 * k3[i]! + k4[i]!)
    }
    return next
  },
}

/**
 * 系统模型接口 — 被控对象的动力学描述
 * 线性/非线性通用，求解器只调用 derivatives()
 */
export interface SystemModel {
  /** 计算状态导数 dx/dt = f(t, x, u) */
  derivatives(t: number, state: Float64Array, input: Float64Array): Float64Array
  /** 计算输出 y = g(t, x, u)，默认等于 state */
  output?(t: number, state: Float64Array, input: Float64Array): Float64Array
}

/** 求解器配置 */
export interface SolverConfig {
  /** 积分步长 (秒) */
  dt: number
}

/** 求解器接口 */
export interface ODESolver {
  /** 推进一个时间步，返回新状态 */
  step(
    model: SystemModel,
    t: number,
    state: Float64Array,
    input: Float64Array,
    dt: number,
  ): Float64Array
}

/** 仿真步结果 */
export interface StepResult {
  t: number
  state: Float64Array
  output: Float64Array
}

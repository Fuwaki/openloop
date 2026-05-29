import { reactive } from 'vue'
import type { ODESolver, SystemModel } from './types'

/** 求解器运行统计 */
export interface SolverStats {
  solverId: string
  stepCount: number
  simTime: number
  wallTimeTotal: number
  wallTimeLastStep: number
  wallTimeAvg: number
  stepsPerSecond: number
}

/** 滑动窗口大小（用于计算 stepsPerSecond） */
const WINDOW_SIZE = 50

/**
 * 包装 ODESolver，收集运行时统计信息。
 * 使用 Vue reactive()，stats 自动响应式。
 */
export function createMeasuredSolver(solver: ODESolver, id: string) {
  const stats = reactive<SolverStats>({
    solverId: id,
    stepCount: 0,
    simTime: 0,
    wallTimeTotal: 0,
    wallTimeLastStep: 0,
    wallTimeAvg: 0,
    stepsPerSecond: 0,
  })

  // 滑动窗口记录最近 N 步的耗时
  const window: number[] = []
  let windowSum = 0

  function step(
    model: SystemModel,
    t: number,
    state: Float64Array,
    input: Float64Array,
    dt: number,
  ): Float64Array {
    const start = performance.now()
    const result = solver.step(model, t, state, input, dt)
    const elapsed = performance.now() - start

    stats.stepCount++
    stats.simTime = t + dt
    stats.wallTimeTotal += elapsed
    stats.wallTimeLastStep = elapsed

    // 滑动窗口
    window.push(elapsed)
    windowSum += elapsed
    if (window.length > WINDOW_SIZE) {
      windowSum -= window.shift()!
    }

    stats.wallTimeAvg = stats.wallTimeTotal / stats.stepCount
    stats.stepsPerSecond = window.length > 0
      ? (window.length / windowSum) * 1000
      : 0

    return result
  }

  function reset() {
    stats.stepCount = 0
    stats.simTime = 0
    stats.wallTimeTotal = 0
    stats.wallTimeLastStep = 0
    stats.wallTimeAvg = 0
    stats.stepsPerSecond = 0
    window.length = 0
    windowSum = 0
  }

  return { step, stats, reset }
}

export type MeasuredSolver = ReturnType<typeof createMeasuredSolver>

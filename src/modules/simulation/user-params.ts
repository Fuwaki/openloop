import { ref } from 'vue'
import type { OlCall } from './analyzer'

export interface UserParamDef {
  name: string
  value: number
  min: number
  max: number
  step: number
}

export const userParams = ref<UserParamDef[]>([])

const DEFAULT_MIN = 0
const DEFAULT_MAX = 100
const DEFAULT_STEP = 0.01

function sanitizeNumber(val: unknown, fallback: number): number {
  if (typeof val !== 'number' || !Number.isFinite(val)) return fallback
  return val
}

function parseOlCallsToParams(calls: OlCall[]): UserParamDef[] {
  return calls
    .filter((c) => c.name === 'openloop.parameter')
    .map((c) => {
      const name = typeof c.args[0] === 'string' ? c.args[0] : `param_${c.line}`
      const value = sanitizeNumber(c.args[1], 0)
      const min = sanitizeNumber(c.kwargs.min, DEFAULT_MIN)
      const max = sanitizeNumber(c.kwargs.max, DEFAULT_MAX)
      const step = sanitizeNumber(c.kwargs.step, DEFAULT_STEP)
      return { name, value, min, max, step }
    })
}

/**
 * 从 analyzer 结果同步用户参数。
 * 保留已有参数的 value（用户已调整的滑块值）。
 */
export function syncUserParams(olCalls: OlCall[]) {
  const newParams = parseOlCallsToParams(olCalls)

  const oldMap = new Map(userParams.value.map((p) => [p.name, p.value]))
  for (const p of newParams) {
    if (oldMap.has(p.name)) {
      p.value = oldMap.get(p.name)!
    }
  }

  userParams.value = newParams
}

export function useUserParams() {
  return { userParams, syncUserParams }
}

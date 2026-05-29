/**
 * 标签系统 — 模型与控制器的匹配依据。
 *
 * 模型侧：系统打 systemTags，每个状态变量打 tags。
 * 控制器侧：声明 requiredSystemTags 和 inputRequirements。
 * 匹配条件：控制器需求 ⊆ 模型提供。
 */

// ── 标签类型 ──

/** 系统级标签 */
export type SystemTag =
  | 'linear'
  | 'nonlinear'
  | string  // 用户可扩展

/** 状态变量标签（语义 + 导数层级） */
export type VarTag =
  | 'position'
  | 'velocity'
  | 'acceleration'
  | 'angle'
  | 'angular-velocity'
  | 'angular-acceleration'
  | 'output'           // 泛指系统输出
  | 'derivative:0'     // 0 阶导（量本身）
  | 'derivative:1'     // 1 阶导
  | 'derivative:2'     // 2 阶导
  | string             // 用户可扩展

// ── 需求描述 ──

/**
 * 单个输入的需求。
 * acceptableTags 内是 OR 关系 — 状态变量只需命中其中一个标签。
 */
export interface InputRequirement {
  /** 此输入可接受的标签（OR） */
  acceptableTags: VarTag[]
  /** 用途说明，用于生成注释和 UI 提示 */
  description: string
}

// ── 匹配结果 ──

export interface MatchResult {
  compatible: boolean
  /** 未匹配上的需求索引列表 */
  missing: number[]
}

/**
 * 检查模型是否满足控制器的输入需求。
 *
 * 规则：对每个 InputRequirement，模型的状态变量中至少有一个
 * 匹配到 acceptableTags 中的任意一个标签。
 */
export function matchController(
  modelSystemTags: string[],
  modelStateTags: string[][],
  requiredSystemTags: string[],
  inputRequirements: InputRequirement[],
): MatchResult {
  // 系统标签检查
  for (const req of requiredSystemTags) {
    if (!modelSystemTags.includes(req)) {
      return { compatible: false, missing: [-1] } // -1 表示系统标签不匹配
    }
  }

  // 输入需求检查：每个需求必须被至少一个状态变量满足
  const missing: number[] = []
  const usedVars = new Set<number>()

  for (let ri = 0; ri < inputRequirements.length; ri++) {
    const req = inputRequirements[ri]!
    let matched = false
    for (let vi = 0; vi < modelStateTags.length; vi++) {
      if (usedVars.has(vi)) continue // 每个状态变量只能匹配一个需求
      const varTags = modelStateTags[vi]!
      if (req.acceptableTags.some((t) => varTags.includes(t))) {
        usedVars.add(vi)
        matched = true
        break
      }
    }
    if (!matched) missing.push(ri)
  }

  return { compatible: missing.length === 0, missing }
}

/**
 * 控制生成标签。
 *
 * 模型侧只保留系统级能力标签；被控量/一阶量/二阶量不再写在状态变量上，
 * 而是由 ModelEntry.controlObjective.derivativeChain 显式描述。
 */

/** 系统级标签 */
export type SystemTag =
  | 'linear'
  | 'nonlinear'
  | string

export interface MatchResult {
  compatible: boolean
  reason?: string
}

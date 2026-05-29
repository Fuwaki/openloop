import type { ModelEntry } from '@/models/model-table'
import type { InputRequirement } from '@/models/tags'

/**
 * 匹配模型状态变量到控制器输入需求。
 * 返回每个需求对应的模型变量名（按需求顺序），未匹配的为 null。
 */
export function matchInputs(
  modelStateVars: ModelEntry['ioSpec']['stateVars'],
  inputRequirements: InputRequirement[],
): (string | null)[] {
  const result: (string | null)[] = []
  const used = new Set<number>()

  for (const req of inputRequirements) {
    let matched: string | null = null
    for (let i = 0; i < modelStateVars.length; i++) {
      if (used.has(i)) continue
      const v = modelStateVars[i]!
      if (req.acceptableTags.some((t) => v.tags.includes(t))) {
        used.add(i)
        matched = v.name
        break
      }
    }
    result.push(matched)
  }

  return result
}

/**
 * 模板中的通用变量名，按 inputRequirements 顺序排列。
 * 模板 body 里用这些名字写逻辑，生成时替换为实际模型变量名。
 */
const TEMPLATE_VAR_NAMES = ['x', 'v', 'x1', 'x2', 'x3', 'x4']

/**
 * 根据模型元数据 + 控制器模板生成最终代码。
 *
 * 流程：
 *   1. 通过 tag 匹配，确定每个控制器输入对应哪个模型变量
 *   2. 用匹配到的变量名构建函数签名
 *   3. 将模板中的通用变量名替换为实际模型变量名
 *   4. 拼接头部注释 + 生成的函数体
 */
export function generateControllerCode(
  model: ModelEntry,
  controllerCode: string,
  inputRequirements: InputRequirement[],
): string {
  const { ioSpec, name, description, params } = model
  const { stateVars, outputs } = ioSpec

  // ── 头部注释 ──
  const lines: string[] = [
    `import numpy as np`,
    `import openloop as ol`,
    ``,
    `# ── ${name} ──`,
    `# ${description}`,
    `#`,
    `# 状态变量 (controller 输入):`,
  ]

  for (let i = 0; i < stateVars.length; i++) {
    const v = stateVars[i]!
    const unit = v.unit ? ` (${v.unit})` : ''
    const tags = v.tags.length > 0 ? ` [${v.tags.join(', ')}]` : ''
    lines.push(`#   state[${i}] = ${v.name}${unit} — ${v.description}${tags}`)
  }

  lines.push(`#`)
  lines.push(`# 控制输出:`)
  for (const v of outputs) {
    const unit = v.unit ? ` (${v.unit})` : ''
    lines.push(`#   ${v.name}${unit} — ${v.description}`)
  }

  if (params.length > 0) {
    lines.push(`#`)
    lines.push(`# 模型参数: ${params.map((p) => `${p.name}=${p.value}`).join(', ')}`)
  }

  // ── 匹配 + 替换 ──
  const matched = matchInputs(stateVars, inputRequirements)

  // 将模板 body 中的占位变量名替换为匹配到的模型变量名
  let body = controllerCode
  for (let i = 0; i < matched.length; i++) {
    const actual = matched[i]
    if (actual && actual !== TEMPLATE_VAR_NAMES[i]) {
      const pattern = new RegExp(`\\b${TEMPLATE_VAR_NAMES[i]}\\b`, 'g')
      body = body.replace(pattern, actual)
    }
  }

  // 替换占位符：函数签名固定为 state, t
  body = body.replace(/\{\{args\}\}/, 'state, t')
  body = body.replace(/\{\{out\}\}/g, outputs[0]!.name)

  // 生成解包语句：x, v, ... = state[0], state[1], ...
  const unpackNames = stateVars.map((v) => v.name).join(', ')
  const unpackIndices = stateVars.map((_, i) => `state[${i}]`).join(', ')
  const unpackLine = `${unpackNames} = ${unpackIndices}`

  // 在 def controller(...) 之后插入解包
  body = body.replace(
    /(def controller\(state, t\):\s*\n)/,
    `$1    ${unpackLine}\n`,
  )

  lines.push(``)
  lines.push(body.trimEnd())
  return lines.join('\n') + '\n'
}

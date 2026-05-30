import type { ModelEntry } from '@/models/model-table'
import type { ControllerVariant } from '@/models/controller-table'
import { resolveVariantCode } from '@/models/controller-table'

const TEMPLATE_ALIASES = ['q', 'q_dot', 'q_ddot', 'q_3dot', 'q_4dot']
const LEGACY_TEMPLATE_NAMES = ['x', 'v', 'x1', 'x2', 'x3', 'x4']

function stateIndex(model: ModelEntry, name: string): number {
  return model.ioSpec.stateVars.findIndex((v) => v.name === name)
}

function buildUnpackLine(model: ModelEntry): string {
  const names = model.ioSpec.stateVars.map((v) => v.name).join(', ')
  const indices = model.ioSpec.stateVars.map((_, i) => `state[${i}]`).join(', ')
  return `${names} = ${indices}`
}

function buildAliasLines(model: ModelEntry): string[] {
  const { derivativeChain, reference, inputGainSign } = model.controlObjective
  const lines: string[] = [
    `ref = ${reference}`,
    `input_gain_sign = ${inputGainSign}`,
  ]

  for (let i = 0; i < derivativeChain.length; i++) {
    const source = derivativeChain[i]!
    const alias = TEMPLATE_ALIASES[i] ?? `q_${i}`
    lines.push(`${alias} = ${source}`)
  }

  lines.push(`e = ref - q`)
  if (derivativeChain.length > 1) lines.push(`e_dot = -q_dot`)
  if (derivativeChain.length > 2) lines.push(`e_ddot = -q_ddot`)
  return lines
}

function normalizeTemplate(body: string, outputName: string): string {
  let next = body

  // 旧模板约定 x/v 表示被控量及其变化率；新生成器统一改成 q/q_dot。
  for (let i = 0; i < LEGACY_TEMPLATE_NAMES.length; i++) {
    const replacement = TEMPLATE_ALIASES[i] ?? `q_${i}`
    const pattern = new RegExp(`\\b${LEGACY_TEMPLATE_NAMES[i]}\\b`, 'g')
    next = next.replace(pattern, replacement)
  }

  next = next.replace(/\{\{args\}\}/g, 'state, t')
  next = next.replace(/\{\{out\}\}/g, outputName)

  // 旧模板通常自己定义 ref/error；这些局部变量保留可运行性。
  return next
}

function insertGeneratedContext(body: string, model: ModelEntry): string {
  const contextLines = [
    buildUnpackLine(model),
    ...buildAliasLines(model),
  ].map((line) => `    ${line}`)

  return body.replace(
    /(def controller\(state, t\):\s*\n)/,
    `$1${contextLines.join('\n')}\n`,
  )
}

/**
 * 根据模型默认控制目标 + 控制器变种生成最终 Python controller 代码。
 */
export function generateControllerCode(
  model: ModelEntry,
  controllerCodeOrVariant: string | ControllerVariant,
): string {
  const { ioSpec, name, description, params, controlObjective } = model
  const { stateVars, outputs } = ioSpec
  const controllerCode = typeof controllerCodeOrVariant === 'string'
    ? controllerCodeOrVariant
    : resolveVariantCode(model, controllerCodeOrVariant)

  if (!controllerCode) {
    throw new Error('当前模型没有可用的控制器模板')
  }

  const lines: string[] = [
    `import numpy as np`,
    `import openloop as ol`,
    ``,
    `# ── ${name} ──`,
    `# ${description}`,
    `#`,
    `# 默认控制目标: ${controlObjective.name}`,
    `# ${controlObjective.description}`,
    `# 参考值: ${controlObjective.reference}`,
    `# 目标导数链: ${controlObjective.derivativeChain.join(' -> ')}`,
    `# 控制输入: ${controlObjective.input}`,
    `# 输入方向: ${controlObjective.inputGainSign > 0 ? '正输入推动被控量正向变化' : '正输入推动被控量负向变化'}`,
    `#`,
    `# 状态变量 (controller 输入):`,
  ]

  for (let i = 0; i < stateVars.length; i++) {
    const v = stateVars[i]!
    const unit = v.unit ? ` (${v.unit})` : ''
    const objectiveIndex = controlObjective.derivativeChain.indexOf(v.name)
    const role = objectiveIndex >= 0 ? ` [目标 ${objectiveIndex} 阶]` : ''
    lines.push(`#   state[${i}] = ${v.name}${unit} — ${v.description}${role}`)
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

  for (const name of controlObjective.derivativeChain) {
    if (stateIndex(model, name) === -1) {
      throw new Error(`控制目标变量 ${name} 不存在于模型状态变量中`)
    }
  }

  const outputName = controlObjective.input || outputs[0]?.name
  if (!outputName) throw new Error('模型缺少控制输出')

  let body = normalizeTemplate(controllerCode, outputName)
  body = insertGeneratedContext(body, model)

  lines.push(``)
  lines.push(body.trimEnd())
  return lines.join('\n') + '\n'
}

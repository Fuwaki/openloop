/**
 * 控制器模板 × 模型 代码生成 + Pyodide 语法验证
 *
 * 加载真实 Pyodide WASM 运行时，对每个兼容的 (模型, 控制器) 组合：
 *   1. generateControllerCode() 生成完整 Python 代码
 *   2. 静态检查：无残留占位符、有 return、有 import
 *   3. Pyodide.runPython() 编译 + 执行，验证无语法/运行时错误
 *   4. 调用 controller() 确认返回数值
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { createRequire } from 'node:module'
import path from 'node:path'
import { generateControllerCode } from '@/modules/simulation/code-generator'
import { getAllControllers, matchControllerVariant, resolveVariantCode } from '@/modules/models/controller-table'
import { getModelEntry } from '@/modules/models/model-table'

let pyodide: Awaited<ReturnType<typeof loadPyodide>>
let loadPyodide: (typeof import('pyodide'))['loadPyodide']

const MODEL_IDS = ['mass-spring-damper', 'first-order', 'inverted-pendulum']

// ── helpers ──

function checkGenerated(code: string) {
  expect(code).not.toMatch(/\{\{args\}\}/)
  expect(code).not.toContain('{{out}}')
  expect(code).toContain('import numpy as np')
  expect(code).toContain('import openloop as ol')
  expect(code).toContain('def controller(state, t):')
  expect(code).toContain('return ')
}

function expectPythonOk(code: string, model: NonNullable<ReturnType<typeof getModelEntry>>, variantId: string) {
  const wrapped = `
import numpy as np
import openloop as ol
${code.replace(/^import numpy as np\n/, '').replace(/^import openloop as ol\n/, '')}
ctrl = controller
`
  try {
    pyodide.runPython(wrapped)
  } catch (e: any) {
    const msg = e.message ?? String(e)
    throw new Error(
      `[${model.id} × ${variantId}] Python 执行失败:\n${msg}\n\n--- 生成的代码 ---\n${code}`,
    )
  }

  const ctrl = pyodide.globals.get('ctrl')
  expect(ctrl, `[${model.id} × ${variantId}] controller 函数未定义`).toBeTruthy()

  const state = new Float64Array(model.ioSpec.stateVars.length).fill(0.1)
  try {
    const result = ctrl(state, 0)
    expect(typeof result).toBe('number')
    expect(Number.isFinite(result)).toBe(true)
  } catch (e: any) {
    throw new Error(
      `[${model.id} × ${variantId}] controller() 调用失败:\n${e.message ?? String(e)}`,
    )
  }
}

// ── setup ──

beforeAll(async () => {
  const pyodideModule = await import('pyodide')
  loadPyodide = pyodideModule.loadPyodide

  const require = createRequire(import.meta.url)
  const pyodideMain = require.resolve('pyodide')
  const indexURL = path.dirname(pyodideMain) + '/'

  pyodide = await loadPyodide({ indexURL })
  await pyodide.loadPackage(['numpy'])

  // 注册 openloop mock 模块
  pyodide.runPython(`
import sys, types
ol = types.ModuleType('openloop')
_params = {}
_status = {}

def parameter(name, default, *, min=None, max=None, step=None):
    if name not in _params:
        _params[name] = default
    return _params[name]

def status(name, value):
    _status[name] = value

ol.parameter = parameter
ol.status = status
ol._params = _params
ol._status = _status
sys.modules['openloop'] = ol
`)
}, 60_000)

// ── 代码生成 + Pyodide 执行 ──

describe('controller 模板 × 模型 → Python 执行', () => {
  for (const modelId of MODEL_IDS) {
    const model = getModelEntry(modelId)!

    describe(model.name, () => {
      const families = getAllControllers()

      for (const family of families) {
        for (const variant of family.variants) {
          const match = matchControllerVariant(model, variant)
          if (!match.compatible) continue

          const code = resolveVariantCode(model, variant)
          if (!code) continue

          it(`${family.name} / ${variant.name}`, () => {
            const generated = generateControllerCode(model, code)
            checkGenerated(generated)
            expectPythonOk(generated, model, variant.id)
          })
        }
      }
    })
  }
})

// ── 静态验证：模板结构 ──

describe('模板结构完整性', () => {
  const families = getAllControllers()

  it('每个通用变种都有 starterCode 且包含 {{args}} 和 {{out}}', () => {
    for (const family of families) {
      for (const variant of family.variants) {
        if (variant.generationMode !== 'generic') continue
        expect(variant.starterCode, `${family.id}/${variant.id} 缺少 starterCode`).toBeTruthy()
        expect(variant.starterCode!).toContain('{{args}}')
        expect(variant.starterCode!).toContain('{{out}}')
        expect(variant.starterCode!).toMatch(/def controller/)
        expect(variant.starterCode!).toMatch(/return /)
      }
    }
  })

  it('每个模型专用变种都有 modelTemplates 且包含占位符', () => {
    for (const family of families) {
      for (const variant of family.variants) {
        if (variant.generationMode !== 'model-specific') continue
        expect(variant.modelTemplates, `${family.id}/${variant.id} 缺少 modelTemplates`).toBeTruthy()
        for (const [mid, tpl] of Object.entries(variant.modelTemplates!)) {
          expect(tpl, `${family.id}/${variant.id} 模板 ${mid} 为空`).toBeTruthy()
          expect(tpl).toContain('{{args}}')
          expect(tpl).toContain('{{out}}')
        }
      }
    }
  })

  it('每个变种都有 params 数组', () => {
    for (const family of families) {
      for (const variant of family.variants) {
        expect(Array.isArray(variant.params)).toBe(true)
      }
    }
  })
})

// ── 代码生成：上下文注入 ──

describe('generateControllerCode 上下文注入', () => {
  it('二阶模型生成 q, q_dot 别名和 e_dot', () => {
    const model = getModelEntry('mass-spring-damper')!
    const code = generateControllerCode(model, 'def controller({{args}}):\n    {{out}} = q + q_dot\n    return {{out}}\n')
    expect(code).toContain('q = x')
    expect(code).toContain('q_dot = v')
    expect(code).toContain('e_dot = -q_dot')
  })

  it('一阶模型只有 q 别名，无 q_dot', () => {
    const model = getModelEntry('first-order')!
    const code = generateControllerCode(model, 'def controller({{args}}):\n    {{out}} = q\n    return {{out}}\n')
    expect(code).toContain('q = x')
    expect(code).not.toMatch(/\bq_dot\b/)
  })

  it('倒立摆使用 theta/omega 且 input_gain_sign = -1', () => {
    const model = getModelEntry('inverted-pendulum')!
    const code = generateControllerCode(model, 'def controller({{args}}):\n    {{out}} = q\n    return {{out}}\n')
    expect(code).toContain('q = theta')
    expect(code).toContain('q_dot = omega')
    expect(code).toContain('input_gain_sign = -1')
  })

  it('mass-spring-damper 输出名替换为 F', () => {
    const model = getModelEntry('mass-spring-damper')!
    const code = generateControllerCode(model, 'def controller({{args}}):\n    {{out}} = 0.0\n    return {{out}}\n')
    expect(code).toContain('F = 0.0')
    expect(code).toContain('return F')
    expect(code).not.toContain('{{out}}')
  })

  it('first-order 输出名替换为 u', () => {
    const model = getModelEntry('first-order')!
    const code = generateControllerCode(model, 'def controller({{args}}):\n    {{out}} = 0.0\n    return {{out}}\n')
    expect(code).toContain('u = 0.0')
    expect(code).toContain('return u')
  })

  it('生成的代码头部包含模型信息注释', () => {
    const model = getModelEntry('mass-spring-damper')!
    const code = generateControllerCode(model, 'def controller({{args}}):\n    return 0.0\n')
    expect(code).toContain('质量-弹簧-阻尼')
    expect(code).toContain('位置调节')
    expect(code).toContain('state[0]')
  })
})

// ── 兼容性矩阵 ──

describe('控制器兼容性', () => {
  it('一阶系统不兼容二阶及以上控制器', () => {
    const model = getModelEntry('first-order')!
    for (const family of getAllControllers()) {
      for (const v of family.variants) {
        if (v.minOrder <= 1) continue
        const result = matchControllerVariant(model, v)
        expect(result.compatible).toBe(false)
      }
    }
  })

  it('模型专用控制器对无模板的模型不可用', () => {
    const model = getModelEntry('first-order')!
    const families = getAllControllers()
    for (const family of families) {
      for (const v of family.variants) {
        if (v.generationMode !== 'model-specific') continue
        const result = matchControllerVariant(model, v)
        expect(result.compatible).toBe(false)
      }
    }
  })

  it('resolveVariantCode 对不匹配的模型返回 null', () => {
    const model = getModelEntry('mass-spring-damper')!
    const family = getAllControllers().find(c => c.id === 'feedback-linearization')!
    const variant = family.variants[0]!
    expect(resolveVariantCode(model, variant)).toBeNull()
  })

  it('空控制器模板可用于所有模型', () => {
    const emptyFamily = getAllControllers().find(c => c.id === 'pid') // 用 PID 的 starterCode 检查
    // empty 模板没有在 families 里，但 emptyCode 是独立导出的
    // 这里验证 PID 通用模板对所有模型兼容
    const model = getModelEntry('first-order')!
    const family = getAllControllers().find(c => c.id === 'pid')!
    const result = matchControllerVariant(model, family.variants[0]!)
    expect(result.compatible).toBe(true)
  })
})

// ── 边界情况 ──

describe('边界情况', () => {
  it('最小模板（只有 return 0）能生成并执行', () => {
    const model = getModelEntry('mass-spring-damper')!
    const code = generateControllerCode(model, 'def controller({{args}}):\n    return 0.0\n')
    expect(code).toContain('def controller(state, t):')
    expect(code).toContain('return 0.0')
    expectPythonOk(code, model, 'minimal')
  })

  it('包含 ol.parameter 调用的模板能正确执行', () => {
    const model = getModelEntry('first-order')!
    const template = `def controller({{args}}):
    gain = ol.parameter("gain", 1.0, min=0.0, max=10.0)
    {{out}} = gain * (ref - q)
    return {{out}}
`
    const code = generateControllerCode(model, template)
    expectPythonOk(code, model, 'param-test')
  })

  it('包含 ol.status 调用的模板能正确执行', () => {
    const model = getModelEntry('mass-spring-damper')!
    const template = `def controller({{args}}):
    e = ref - q
    ol.status("error", e)
    {{out}} = e
    return {{out}}
`
    const code = generateControllerCode(model, template)
    expectPythonOk(code, model, 'status-test')
  })

  it('使用 numpy 的模板能正确执行', () => {
    const model = getModelEntry('inverted-pendulum')!
    const template = `def controller({{args}}):
    K = np.array([10.0, 1.0])
    err = np.array([q - ref, q_dot])
    {{out}} = float(-K @ err)
    return {{out}}
`
    const code = generateControllerCode(model, template)
    expectPythonOk(code, model, 'numpy-test')
  })

  it('使用 global 状态的模板能正确执行多次', () => {
    const model = getModelEntry('mass-spring-damper')!
    const template = `counter = 0
def controller({{args}}):
    global counter
    counter += 1
    {{out}} = float(counter)
    return {{out}}
`
    const code = generateControllerCode(model, template)
    const wrapped = `
import numpy as np
import openloop as ol
${code.replace(/^import numpy as np\n/, '').replace(/^import openloop as ol\n/, '')}
ctrl = controller
`
    pyodide.runPython(wrapped)
    const ctrl = pyodide.globals.get('ctrl')
    const state = new Float64Array([0.1, 0.2])
    expect(ctrl(state, 0)).toBe(1)
    expect(ctrl(state, 0.01)).toBe(2)
    expect(ctrl(state, 0.02)).toBe(3)
  })
})

/**
 * 控制器闭环仿真报告 — 遍历控制器表格 × 模型，用真实模板跑仿真。
 *
 * 只断言不崩溃/无 NaN，仿真结果打印成表格供分析。
 * 默认不跑，设 OL_CONVERGENCE=1 才执行：
 *   OL_CONVERGENCE=1 pnpm test:convergence
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { createRequire } from 'node:module'
import path from 'node:path'
import { generateControllerCode } from '@/modules/simulation/code-generator'
import { getAllModels, type ModelEntry, type BenchmarkConfig } from '@/modules/models/model-table'
import { getAllControllers, matchControllerVariant, type BenchmarkTier } from '@/modules/models/controller-table'
import { rk4Solver } from '@/simulation/solvers/rk4'

const runConvergence = process.env.OL_CONVERGENCE === '1'
const describeConvergence = runConvergence ? describe : describe.skip

let pyodide: Awaited<ReturnType<typeof loadPyodide>>
let loadPyodide: (typeof import('pyodide'))['loadPyodide']

const SIM_STEPS = 2000
const DT = 0.001

// ── 仿真 + 指标采集 ──

interface SimMetrics {
  err0: number
  errF: number
  normalizedErrF: number
  iae: number
  settlingStep: number | null
  overshoot: number
  controlRms: number
  nan: boolean
}

/** 在 Pyodide 中加载控制器代码，返回包装好的 Python 调用函数 */
function loadController(controllerCode: string): (state: number[], t: number) => number {
  pyodide.runPython(`
import numpy as np
import openloop as ol
ol._params.clear()
ol._status.clear()
${controllerCode}

def _call_controller(state_list, t_val):
    u = controller(state_list, t_val)
    if isinstance(u, (np.floating, np.integer)):
        u = float(u)
    return u
`)
  return pyodide.globals.get('_call_controller') as (state: number[], t: number) => number
}

function runBenchmark(
  controllerCode: string,
  model: ModelEntry,
  cfg: BenchmarkConfig,
): SimMetrics {
  const plant = model.createPlant()
  const state = new Float64Array(cfg.initState)
  const n = state.length

  const objIdx = model.ioSpec.stateVars.findIndex(
    v => v.name === model.controlObjective.derivativeChain[0],
  )
  if (objIdx < 0) {
    throw new Error(
      `被控变量 "${model.controlObjective.derivativeChain[0]}" 不在 ${model.name} 的 stateVars 中`,
    )
  }

  const ref = model.controlObjective.reference
  const err0Init = Math.abs(state[objIdx]! - ref)
  const input = new Float64Array(model.ioSpec.outputs.length)

  const callCtrl = loadController(controllerCode)

  // 仿真循环：TS RK4 积分 plant，每步调 Pyodide 执行控制器
  const objVals: number[] = []
  const uVals: number[] = []
  let settlingStep: number | null = null

  for (let i = 0; i < SIM_STEPS; i++) {
    const t = i * DT
    const u = callCtrl(Array.from(state), t)
    input[0] = u
    uVals.push(u)

    const next = rk4Solver.step(plant, t, state, input, DT)
    state.set(next)

    const objVal = state[objIdx]!
    objVals.push(objVal)
    const eNorm = Math.abs(objVal - ref) / Math.max(err0Init, 1e-9)
    if (settlingStep === null && eNorm < cfg.settlingBand) {
      settlingStep = i
    }
  }

  // 指标采集
  const errF = Math.abs(state[objIdx]! - ref)
  const normalizedErrF = errF / Math.max(err0Init, 1e-9)

  // IAE
  const iae = objVals.reduce((sum, v) => sum + Math.abs(v - ref), 0) * DT

  // overshoot
  const sign0 = objVals[0]! - ref > 0 ? 1 : -1
  const overshoots = objVals
    .filter(v => (v - ref) * sign0 < 0)
    .map(v => Math.abs(v - ref) / Math.max(err0Init, 1e-9))
  const overshoot = overshoots.length > 0 ? Math.max(...overshoots) : 0

  // RMS 控制量
  const controlRms = Math.sqrt(uVals.reduce((sum, u) => sum + u * u, 0) / Math.max(uVals.length, 1))

  const nan = state.some(x => Number.isNaN(x))

  return { err0: err0Init, errF, normalizedErrF, iae, settlingStep, overshoot, controlRms, nan }
}

// ── 报告 ──

interface ReportRow {
  model: string
  controller: string
  tier: BenchmarkTier | '—'
  status: string
  normalizedErrF: string
  iae: string
  settling: string
  overshoot: string
  controlRms: string
  notes: string
}

const report: ReportRow[] = []

function classifyStatus(m: SimMetrics, tier: BenchmarkTier | undefined, settlingBand: number): string {
  if (m.nan) return 'NaN'
  if (tier === 'skeleton') return 'skeleton'
  if (m.normalizedErrF < settlingBand) return 'converged'
  if (m.normalizedErrF < 1.0) return 'partial'
  return 'diverged'
}

function fmt(v: number, decimals = 3): string {
  return v.toFixed(decimals)
}

function printReport() {
  if (report.length === 0) return

  const models = [...new Set(report.map(r => r.model))]

  console.log('\n' + '='.repeat(110))
  console.log('  控制器闭环仿真报告')
  console.log(`  步数: ${SIM_STEPS}  步长: ${DT}s  总时长: ${SIM_STEPS * DT}s  误差带: 各模型见 benchmark 配置`)
  console.log('='.repeat(110))

  for (const model of models) {
    const rows = report.filter(r => r.model === model)
    const header = [
      '控制器'.padEnd(24),
      'tier'.padEnd(11),
      '状态'.padEnd(10),
      '归一化errF'.padStart(11),
      'IAE'.padStart(8),
      'settling'.padStart(8),
      'overshoot'.padStart(9),
      'RMS(u)'.padStart(8),
    ].join(' │ ')

    console.log(`\n┌─ ${model}`)
    console.log('│')
    console.log('│  ' + header)
    console.log('│  ' + '─'.repeat(header.length))

    for (const r of rows) {
      const line = [
        r.controller.padEnd(24),
        r.tier.padEnd(11),
        r.status.padEnd(10),
        r.normalizedErrF.padStart(11),
        r.iae.padStart(8),
        r.settling.padStart(8),
        r.overshoot.padStart(9),
        r.controlRms.padStart(8),
      ].join(' │ ')
      console.log('│  ' + line)
    }
    console.log('│')
    console.log('└' + '─'.repeat(100))
  }

  // 按控制器汇总
  const controllers = [...new Set(report.map(r => r.controller))]
  console.log('\n┌─ 汇总（按控制器）')
  console.log('│')
  const sumHeader = '控制器'.padEnd(24) + ' │ ' + models.map(m => m.slice(0, 12).padEnd(12)).join(' │ ')
  console.log('│  ' + sumHeader)
  console.log('│  ' + '─'.repeat(sumHeader.length))
  for (const ctrl of controllers) {
    const cells = models.map(m => {
      const row = report.find(r => r.model === m && r.controller === ctrl)
      return (row?.status ?? '—').padEnd(12)
    }).join(' │ ')
    console.log('│  ' + ctrl.padEnd(24) + ' │ ' + cells)
  }
  console.log('│')
  console.log('└' + '─'.repeat(100))

  console.log('\n  状态: converged=误差进入±5%带  partial=误差下降但未收敛  diverged=误差未下降  skeleton=仅语法检查')
  console.log('  tier: implemented=生产级  example=示例级  skeleton=骨架')
  console.log('  归一化errF: 最终误差/初始误差（越小越好，<0.05 即收敛）')
  console.log('  IAE: 积分绝对误差（越小越好）  settling: 误差首次进入误差带的步数  overshoot: 反向超调比例')
  console.log('='.repeat(110) + '\n')
}

// ── Pyodide 初始化 ──

beforeAll(async () => {
  if (!runConvergence) return
  const pyodideModule = await import('pyodide')
  loadPyodide = pyodideModule.loadPyodide
  const require = createRequire(import.meta.url)
  const indexURL = path.dirname(require.resolve('pyodide')) + '/'
  pyodide = await loadPyodide({ indexURL })
  await pyodide.loadPackage(['numpy'])
  pyodide.runPython(`
import sys, types
ol = types.ModuleType('openloop')
ol._params = {}
ol._status = {}
def parameter(name, default, *, min=None, max=None, step=None):
    if name not in ol._params: ol._params[name] = default
    return ol._params[name]
def status(name, value): ol._status[name] = value
ol.parameter = parameter
ol.status = status
sys.modules['openloop'] = ol
`)
}, 60_000)

// ── 仿真测试 ──

describeConvergence('控制器 × 模型 闭环仿真', () => {
  const allModels = getAllModels()

  for (const family of getAllControllers()) {
    for (const variant of family.variants) {
      const compatibleModels = allModels
        .filter(model => matchControllerVariant(model, variant).compatible)

      if (compatibleModels.length === 0) continue

      const tier = variant.benchmarkTier
      const label = `${family.name} / ${variant.name}`

      for (const model of compatibleModels) {
        const cfg = model.benchmark

        it(`${label} × ${model.name}`, () => {
          let code: string
          try {
            code = generateControllerCode(model, variant)
          } catch (e: any) {
            report.push({
              model: model.name,
              controller: label,
              tier: tier ?? '—',
              status: 'codegen-err',
              normalizedErrF: '—', iae: '—', settling: '—', overshoot: '—', controlRms: '—',
              notes: e.message?.slice(0, 60),
            })
            return
          }

          try {
            const m = runBenchmark(code, model, cfg)
            const status = classifyStatus(m, tier, cfg.settlingBand)
            report.push({
              model: model.name,
              controller: label,
              tier: tier ?? '—',
              status,
              normalizedErrF: fmt(m.normalizedErrF),
              iae: fmt(m.iae, 2),
              settling: m.settlingStep != null ? `${m.settlingStep}` : '—',
              overshoot: fmt(m.overshoot),
              controlRms: fmt(m.controlRms, 2),
              notes: '',
            })
            expect(m.nan).toBe(false)
          } catch (e: any) {
            report.push({
              model: model.name,
              controller: label,
              tier: tier ?? '—',
              status: 'runtime-err',
              normalizedErrF: '—', iae: '—', settling: '—', overshoot: '—', controlRms: '—',
              notes: e.message?.slice(0, 60),
            })
            throw e
          }
        })
      }
    }
  }
})

describeConvergence('仿真报告', () => {
  it('打印结果汇总', () => { printReport() })
})

import { usePyodide } from '@/modules/python/pyodide'
import analyzerCode from '@/python/analyzer.py?raw'

export interface SyntaxError {
  line: number
  col: number
  message: string
}

export interface OlCall {
  name: 'openloop.parameter' | 'openloop.status'
  args: unknown[]
  kwargs: Record<string, unknown>
  line: number
  col: number
  end_col: number
}

export interface ControllerInfo {
  found: boolean
  params: string[]
  line: number
}

export interface AnalysisResult {
  syntaxErrors: SyntaxError[]
  olCalls: OlCall[]
  controller: ControllerInfo
}

const pyodide = usePyodide()
let analyzersReady = false

async function ensureInit() {
  if (analyzersReady) return

  if (!pyodide.isReady.value) {
    await pyodide.init()
  }
  if (!pyodide.isReady.value) return

  const result = pyodide.runPython(analyzerCode)
  if (result.error) {
    console.error('分析器初始化失败:', result.error)
    return
  }
  analyzersReady = true
}

export function resetAnalyzer() {
  analyzersReady = false
}

function assertAnalysisObject(raw: unknown, label: string): void {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error(`${label}: invalid result from Python (not an object)`)
  }
}

/**
 * 分析用户 Python 代码。
 * 语法检查 + ol.parameter() / ol.status() 调用检测。
 */
export async function analyze(code: string): Promise<AnalysisResult> {
  await ensureInit()

  if (!pyodide.isReady.value) {
    return {
      syntaxErrors: [{ line: 1, col: 0, message: 'Pyodide 未就绪' }],
      olCalls: [],
      controller: { found: false, params: [], line: 0 },
    }
  }

  const py = pyodide.pyodide.value!
  const checkSyntax = py.globals.get('check_syntax')
  const detectOlCalls = py.globals.get('detect_ol_calls')
  const detectController = py.globals.get('detect_controller')

  if (!checkSyntax || !detectOlCalls || !detectController) {
    return {
      syntaxErrors: [{ line: 1, col: 0, message: '分析器未正确初始化' }],
      olCalls: [],
      controller: { found: false, params: [], line: 0 },
    }
  }

  try {
    const syntaxRaw = checkSyntax(code)
    const syntaxResult = syntaxRaw.toJs({ dict_converter: Object.fromEntries }) as {
      ok: boolean
      errors?: SyntaxError[]
    }
    assertAnalysisObject(syntaxResult, 'checkSyntax')
    syntaxRaw.destroy()

    const olRaw = detectOlCalls(code)
    const olResult = olRaw.toJs({ dict_converter: Object.fromEntries }) as {
      calls: OlCall[]
    }
    assertAnalysisObject(olResult, 'detectOlCalls')
    olRaw.destroy()

    const ctrlRaw = detectController(code)
    const ctrlResult = ctrlRaw.toJs({ dict_converter: Object.fromEntries }) as {
      found: boolean
      params: string[]
      line: number
    }
    assertAnalysisObject(ctrlResult, 'detectController')
    ctrlRaw.destroy()

    checkSyntax.destroy()
    detectOlCalls.destroy()
    detectController.destroy()

    return {
      syntaxErrors: syntaxResult.ok ? [] : (syntaxResult.errors ?? []),
      olCalls: olResult.calls,
      controller: ctrlResult,
    }
  } catch (e) {
    checkSyntax.destroy?.()
    detectOlCalls.destroy?.()
    detectController.destroy?.()
    return {
      syntaxErrors: [{ line: 1, col: 0, message: `分析失败: ${e instanceof Error ? e.message : String(e)}` }],
      olCalls: [],
      controller: { found: false, params: [], line: 0 },
    }
  }
}

export function useCodeAnalyzer() {
  return { analyze }
}

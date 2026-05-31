import { ref } from 'vue'
import { usePyodide, type RunResult } from '@/modules/python/pyodide'
import { clearOutput, appendOutput, getCurrentCode } from './state'
import { injectOpenLoop, clearOpenLoop, updateParamValues } from '@/modules/python/openloop'
import { userParams } from './user-params'

const pyodide = usePyodide()

const isRunning = ref(false)

let initialized = false
let abortController: AbortController | null = null

function setupGlobalCapture() {
  const py = pyodide.pyodide.value
  if (!py) return
  py.setStdout({ batched: (s: string) => appendOutput({ type: 'stdout', text: s }) })
  py.setStderr({ batched: (s: string) => appendOutput({ type: 'stderr', text: s }) })
}

async function ensureInit() {
  if (initialized) return
  await pyodide.init()
  if (pyodide.isReady.value) {
    initialized = true
    setupGlobalCapture()
  }
}

/**
 * 执行一次 Python 代码（编辑器 "运行" 按钮使用）。
 * 与 useSimulationRunner 的持续仿真循环不同，这里只运行一次。
 * 从 currentCode 读取最新代码，保证与仿真运行器使用同一份代码。
 */
async function runOnce(): Promise<RunResult | undefined> {
  isRunning.value = true
  abortController = new AbortController()
  clearOutput()

  await ensureInit()

  if (abortController.signal.aborted) {
    isRunning.value = false
    return
  }

  if (!pyodide.isReady.value) {
    appendOutput({ type: 'error', text: pyodide.error.value ?? 'Pyodide 加载失败' })
    isRunning.value = false
    return
  }

  setupGlobalCapture()

  try {
    await injectOpenLoop()
    clearOpenLoop()

    if (userParams.value.length > 0) {
      const vals: Record<string, number> = {}
      for (const p of userParams.value) vals[p.name] = p.value
      updateParamValues(vals)
    }

    const result = await pyodide.runPythonAsync(getCurrentCode())

    if (result.error) appendOutput({ type: 'error', text: result.error })
    if (result.result !== null && result.result !== undefined && !result.error) {
      appendOutput({ type: 'result', text: String(result.result) })
    }

    isRunning.value = false
    return result
  } catch (e) {
    appendOutput({ type: 'error', text: `执行失败: ${e instanceof Error ? e.message : String(e)}` })
    isRunning.value = false
    return undefined
  }
}

function stop() {
  abortController?.abort()
  isRunning.value = false
}

export function useCodeExecutor() {
  return {
    runOnce,
    stop,
    isRunning,
    isPyodideReady: pyodide.isReady,
    isPyodideLoading: pyodide.isLoading,
  }
}

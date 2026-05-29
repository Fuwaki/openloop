import { ref } from 'vue'
import { usePyodide, type RunResult } from './usePyodide'
import { clearOutput, appendOutput, currentCode } from './useSimulationState'
import { injectOpenLoop, clearOpenLoop, updateParamValues } from './useOpenLoopModule'
import { userParams } from './useUserParams'

const pyodide = usePyodide()

const isRunning = ref(false)

let initialized = false
let abortFlag = false

// 全局 stdout/stderr 捕获 → outputHistory
// useControllerBridge.load 会在加载 controller 后覆盖此设置
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
 *
 * stdout/stderr 通过全局捕获自动进入 outputHistory。
 */
async function runOnce(): Promise<RunResult | undefined> {
  isRunning.value = true
  abortFlag = false
  clearOutput()

  await ensureInit()

  if (abortFlag) {
    isRunning.value = false
    return
  }

  if (!pyodide.isReady.value) {
    appendOutput({ type: 'error', text: pyodide.error.value ?? 'Pyodide 加载失败' })
    isRunning.value = false
    return
  }

  // 确保全局捕获已设置（可能被 useControllerBridge 覆盖后需要重新设置）
  setupGlobalCapture()

  try {
    // 注入 openloop 模块（用户代码可能 import openloop）
    await injectOpenLoop()
    clearOpenLoop()

    // 注入当前滑块值，让 parameter() 返回滑块值而非默认值
    if (userParams.value.length > 0) {
      const vals: Record<string, number> = {}
      for (const p of userParams.value) vals[p.name] = p.value
      updateParamValues(vals)
    }

    const result = await pyodide.runPythonAsync(currentCode.value)

    // stdout/stderr 通过全局捕获自动进入 outputHistory
    // 这里只处理 result 和 error
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
  abortFlag = true
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

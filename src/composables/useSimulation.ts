import { ref } from 'vue'
import { usePyodide, type RunResult } from './usePyodide'

const pyodide = usePyodide()

const lastResult = ref<RunResult | null>(null)
const isRunning = ref(false)
const outputHistory = ref<Array<{ type: 'stdout' | 'stderr' | 'error' | 'result'; text: string }>>([])

let initialized = false
let abortFlag = false

async function ensureInit() {
  if (initialized) return
  initialized = true
  await pyodide.init()
}

async function runCode(code: string) {
  isRunning.value = true
  abortFlag = false
  outputHistory.value = []

  await ensureInit()

  if (abortFlag) {
    isRunning.value = false
    return
  }

  if (!pyodide.isReady.value) {
    outputHistory.value.push({ type: 'error', text: pyodide.error.value ?? 'Pyodide 加载失败' })
    isRunning.value = false
    return
  }

  const result = await pyodide.runPythonAsync(code)
  lastResult.value = result

  if (result.stdout) {
    outputHistory.value.push({ type: 'stdout', text: result.stdout })
  }
  if (result.stderr) {
    outputHistory.value.push({ type: 'stderr', text: result.stderr })
  }
  if (result.error) {
    outputHistory.value.push({ type: 'error', text: result.error })
  }
  if (result.result !== null && result.result !== undefined && !result.error) {
    outputHistory.value.push({ type: 'result', text: String(result.result) })
  }

  isRunning.value = false
}

function stopSimulation() {
  abortFlag = true
  isRunning.value = false
  outputHistory.value.push({ type: 'stderr', text: '仿真已停止' })
}

function clearOutput() {
  outputHistory.value = []
  lastResult.value = null
}

export function useSimulation() {
  return {
    isRunning,
    lastResult,
    outputHistory,
    runCode,
    stopSimulation,
    clearOutput,
    isPyodideReady: pyodide.isReady,
    isPyodideLoading: pyodide.isLoading,
    pyodideError: pyodide.error,
  }
}

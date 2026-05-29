import { ref, shallowRef } from 'vue'
import type { PyodideAPI } from 'pyodide'

const DEFAULT_PYODIDE_INDEX_URL = 'https://cdn.jsdelivr.net/pyodide/v0.29.4/full/'

export interface RunResult {
  result: unknown
  stdout: string
  stderr: string
  error: string | null
}

// 模块级单例状态
const pyodide = shallowRef<PyodideAPI | null>(null)
const isReady = ref(false)
const isLoading = ref(false)
const error = ref<string | null>(null)
let initPromise: Promise<void> | null = null

async function init(indexURL?: string, packages: string[] = ['numpy']) {
  if (pyodide.value) return
  if (initPromise) return initPromise

  isLoading.value = true
  error.value = null

  initPromise = (async () => {
    const { loadPyodide } = await import('pyodide')
    const instance = await loadPyodide({
      indexURL: indexURL ?? DEFAULT_PYODIDE_INDEX_URL,
    })

    if (packages.length > 0) {
      await instance.loadPackage(packages)
    }

    pyodide.value = instance
    isReady.value = true
  })()

  try {
    await initPromise
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
    initPromise = null
  } finally {
    isLoading.value = false
  }
}

function runPython(code: string): RunResult {
  if (!pyodide.value) {
    return { result: null, stdout: '', stderr: '', error: 'Pyodide not initialized' }
  }

  try {
    const result = pyodide.value.runPython(code)
    return { result, stdout: '', stderr: '', error: null }
  } catch (e) {
    return {
      result: null,
      stdout: '',
      stderr: '',
      error: e instanceof Error ? e.message : String(e),
    }
  }
}

async function runPythonAsync(code: string): Promise<RunResult> {
  if (!pyodide.value) {
    return { result: null, stdout: '', stderr: '', error: 'Pyodide not initialized' }
  }

  try {
    const result = await pyodide.value.runPythonAsync(code)
    return { result, stdout: '', stderr: '', error: null }
  } catch (e) {
    return {
      result: null,
      stdout: '',
      stderr: '',
      error: e instanceof Error ? e.message : String(e),
    }
  }
}

/** 重置状态（仅测试用） */
function reset() {
  pyodide.value = null
  isReady.value = false
  isLoading.value = false
  error.value = null
  initPromise = null
}

/**
 * Pyodide 运行时 — 单例。
 * 所有调用方共享同一个 Pyodide 实例。
 */
export function usePyodide() {
  return { pyodide, isReady, isLoading, error, init, runPython, runPythonAsync, reset }
}

import { ref, shallowRef } from 'vue'
import type { PyodideAPI } from 'pyodide'
import { useToast } from './useToast'
import { installFetchCache } from './usePackageCache'
import { useSettings } from './useSettings'

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

async function init(indexURL?: string, packages?: string[]) {
  if (pyodide.value) return
  if (initPromise) return initPromise

  installFetchCache()
  isLoading.value = true
  error.value = null

  const { settings } = useSettings()
  const pkgs = packages ?? settings.value.preloadPackages

  const { toasts, toast, remove } = useToast()
  let loadingId: number | null = null

  const showLoading = (msg: string) => {
    if (loadingId !== null) remove(loadingId)
    loadingId = null
    toast(msg, 'info', 0)
    // 最新一条 toast 就是刚加入的
    loadingId = toasts.value[toasts.value.length - 1]?.id ?? null
  }

  showLoading('正在加载 Python 运行时…')

  initPromise = (async () => {
    const { loadPyodide } = await import('pyodide')
    const instance = await loadPyodide({
      indexURL: indexURL ?? DEFAULT_PYODIDE_INDEX_URL,
    })

    if (pkgs.length > 0) {
      showLoading(`正在加载 ${pkgs.join(', ')}…`)
      await instance.loadPackage(pkgs)
    }

    pyodide.value = instance
    isReady.value = true
  })()

  try {
    await initPromise
    if (loadingId !== null) remove(loadingId)
    toast('Python 运行时就绪', 'info', 2000)
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
    initPromise = null
    if (loadingId !== null) remove(loadingId)
    toast(`Python 运行时加载失败: ${error.value}`, 'error')
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

async function restart(indexURL?: string) {
  reset()
  await init(indexURL)
}

/**
 * Pyodide 运行时 — 单例。
 * 所有调用方共享同一个 Pyodide 实例。
 */
export function usePyodide() {
  return { pyodide, isReady, isLoading, error, init, runPython, runPythonAsync, reset, restart }
}

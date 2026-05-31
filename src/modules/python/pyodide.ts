import { ref, shallowRef } from 'vue'
import type { PyodideAPI } from 'pyodide'
import { useToast } from '@/modules/app'
import { installFetchCache } from './cache'
import { useSettings } from '@/modules/app'

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
let retryCount = 0
const MAX_RETRIES = 3

async function init(indexURL?: string, packages?: string[]) {
  if (pyodide.value) return
  if (initPromise) return initPromise
  if (retryCount >= MAX_RETRIES) {
    error.value = `Python 运行时加载失败，已重试 ${MAX_RETRIES} 次`
    return
  }

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
    retryCount = 0
    if (loadingId !== null) remove(loadingId)
    toast('Python 运行时就绪', 'info', 2000)
  } catch (e) {
    retryCount++
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
  retryCount = 0
}

async function restart(indexURL?: string) {
  reset()
  await init(indexURL)
}

export function usePyodide() {
  return { pyodide, isReady, isLoading, error, init, runPython, runPythonAsync, reset, restart }
}

import { ref, shallowRef } from 'vue'
import type { PyodideAPI } from 'pyodide'

const DEFAULT_PYODIDE_INDEX_URL = 'https://cdn.jsdelivr.net/pyodide/v0.29.4/full/'

export interface RunResult {
  result: unknown
  stdout: string
  stderr: string
  error: string | null
}

export function usePyodide() {
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

    const stdout: string[] = []
    const stderr: string[] = []

    pyodide.value.setStdout({ batched: (s) => stdout.push(s) })
    pyodide.value.setStderr({ batched: (s) => stderr.push(s) })

    try {
      const result = pyodide.value.runPython(code)
      return { result, stdout: stdout.join('\n'), stderr: stderr.join('\n'), error: null }
    } catch (e) {
      return {
        result: null,
        stdout: stdout.join('\n'),
        stderr: stderr.join('\n'),
        error: e instanceof Error ? e.message : String(e),
      }
    }
  }

  async function runPythonAsync(code: string): Promise<RunResult> {
    if (!pyodide.value) {
      return { result: null, stdout: '', stderr: '', error: 'Pyodide not initialized' }
    }

    const stdout: string[] = []
    const stderr: string[] = []

    pyodide.value.setStdout({ batched: (s) => stdout.push(s) })
    pyodide.value.setStderr({ batched: (s) => stderr.push(s) })

    try {
      const result = await pyodide.value.runPythonAsync(code)
      return { result, stdout: stdout.join('\n'), stderr: stderr.join('\n'), error: null }
    } catch (e) {
      return {
        result: null,
        stdout: stdout.join('\n'),
        stderr: stderr.join('\n'),
        error: e instanceof Error ? e.message : String(e),
      }
    }
  }

  return { pyodide, isReady, isLoading, error, init, runPython, runPythonAsync }
}

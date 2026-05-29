import { describe, it, expect, vi, beforeEach } from 'vitest'
import { usePyodide } from '../usePyodide'

// Mock pyodide module — WASM can't run in Node
vi.mock('pyodide', () => {
  let stdoutCallback: ((s: string) => void) | null = null
  let _stderrCallback: ((s: string) => void) | null = null

  const mockPyodide = {
    runPython: vi.fn((code: string) => {
      // Simulate stdout for print()
      const printMatch = code.match(/^print\((.+)\)$/)
      if (printMatch && stdoutCallback) {
        stdoutCallback(printMatch[1].replace(/['"]/g, ''))
      }
      // Simulate eval
      if (code.includes('1 + 2')) return 3
      if (code.includes('import numpy')) {
        if (stdoutCallback) stdoutCallback('') // no output on import
        return undefined
      }
      if (code.includes('numpy.array')) return { toJs: () => [1, 2, 3] }
      if (code.includes('syntax error!')) throw new SyntaxError('invalid syntax')
      if (code.includes('1 / 0')) throw new Error('ZeroDivisionError: division by zero')
      return code // echo back as default
    }),
    runPythonAsync: vi.fn(async (code: string) => {
      return mockPyodide.runPython(code)
    }),
    loadPackage: vi.fn(() => Promise.resolve()),
    setStdout: vi.fn((opts: { batched?: (s: string) => void }) => {
      stdoutCallback = opts.batched ?? null
    }),
    setStderr: vi.fn((opts: { batched?: (s: string) => void }) => {
      _stderrCallback = opts.batched ?? null
    }),
  }

  return {
    loadPyodide: vi.fn(() => Promise.resolve(mockPyodide)),
    __mockPyodide: mockPyodide,
  }
})

describe('usePyodide', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    usePyodide().reset()
  })

  it('初始状态正确', () => {
    const { isReady, isLoading, error, pyodide } = usePyodide()
    expect(isReady.value).toBe(false)
    expect(isLoading.value).toBe(false)
    expect(error.value).toBeNull()
    expect(pyodide.value).toBeNull()
  })

  it('init 加载 Pyodide 并更新状态', async () => {
    const { init, isReady, isLoading, pyodide } = usePyodide()
    const { loadPyodide } = await import('pyodide')

    const readyPromise = init()
    expect(isLoading.value).toBe(true)

    await readyPromise
    expect(isReady.value).toBe(true)
    expect(isLoading.value).toBe(false)
    expect(pyodide.value).not.toBeNull()
    expect(loadPyodide).toHaveBeenCalledWith({
      indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.29.4/full/',
    })
    expect(pyodide.value?.loadPackage).toHaveBeenCalledWith(['numpy'])
  })

  it('重复调用 init 不会重新加载', async () => {
    const { init, pyodide } = usePyodide()
    const { loadPyodide } = await import('pyodide')

    await init()
    const firstInstance = pyodide.value
    await init()
    expect(pyodide.value).toBe(firstInstance)
    expect(loadPyodide).toHaveBeenCalledTimes(1)
  })

  it('runPython 在未初始化时返回错误', () => {
    const { runPython } = usePyodide()
    const result = runPython('1 + 1')
    expect(result.error).toBe('Pyodide not initialized')
    expect(result.result).toBeNull()
  })

  it('runPython 执行简单表达式', async () => {
    const { init, runPython } = usePyodide()
    await init()

    const result = runPython('1 + 2')
    expect(result.result).toBe(3)
    expect(result.error).toBeNull()
  })

  it('runPython 不捕获 stdout（由调用方设置全局重定向）', async () => {
    const { init, runPython } = usePyodide()
    await init()

    const result = runPython("print('hello world')")
    expect(result.stdout).toBe('')
    expect(result.error).toBeNull()
  })

  it('runPython 处理语法错误', async () => {
    const { init, runPython } = usePyodide()
    await init()

    const result = runPython('syntax error!')
    expect(result.error).toContain('invalid syntax')
    expect(result.result).toBeNull()
  })

  it('runPython 处理运行时错误', async () => {
    const { init, runPython } = usePyodide()
    await init()

    const result = runPython('1 / 0')
    expect(result.error).toContain('ZeroDivisionError')
    expect(result.result).toBeNull()
  })

  it('runPythonAsync 正常工作', async () => {
    const { init, runPythonAsync } = usePyodide()
    await init()

    const result = await runPythonAsync('1 + 2')
    expect(result.result).toBe(3)
    expect(result.error).toBeNull()
  })

  it('runPythonAsync 在未初始化时返回错误', async () => {
    const { runPythonAsync } = usePyodide()
    const result = await runPythonAsync('1 + 1')
    expect(result.error).toBe('Pyodide not initialized')
  })

  it('支持 numpy 导入', async () => {
    const { init, runPython } = usePyodide()
    await init()

    const importResult = runPython('import numpy')
    expect(importResult.error).toBeNull()

    const arrResult = runPython('numpy.array([1, 2, 3])')
    expect(arrResult.error).toBeNull()
    expect(arrResult.result).toBeDefined()
  })
})

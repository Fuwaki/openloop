import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useControllerBridge } from '../bridge'

// Mock pyodide — 模拟 globals.get('controller') 返回 Python 函数
vi.mock('pyodide', () => {
  const mockController = Object.assign(vi.fn((state: Float64Array, _t: number) => {
    // 模拟简单 PD 控制器
    const x = state[0] ?? 0
    const v = state[1] ?? 0
    return -10 * x - 2 * v
  }), { destroy: vi.fn() })

  const mockPyodide = {
    runPython: vi.fn(() => undefined),
    runPythonAsync: vi.fn(async () => ({ result: undefined, stdout: '', stderr: '', error: null })),
    loadPackage: vi.fn(() => Promise.resolve()),
    setStdout: vi.fn(),
    setStderr: vi.fn(),
    globals: {
      get: vi.fn((name: string) => {
        if (name === 'controller') return mockController
        throw new Error(`NameError: ${name} is not defined`)
      }),
    },
  }

  return {
    loadPyodide: vi.fn(() => Promise.resolve(mockPyodide)),
    __mockPyodide: mockPyodide,
    __mockController: mockController,
  }
})

describe('useControllerBridge', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('初始状态正确', () => {
    const bridge = useControllerBridge()
    expect(bridge.controller.value).toBeNull()
    expect(bridge.isReady.value).toBe(false)
    expect(bridge.error.value).toBeNull()
  })

  it('call 未加载时返回 0', () => {
    const bridge = useControllerBridge()
    const result = bridge.call(new Float64Array([1, 0]), 0)
    expect(result).toBe(0)
  })

  it('load 成功后 isReady 为 true', async () => {
    const bridge = useControllerBridge()
    const ok = await bridge.load('def controller(state, t): return 0')
    expect(ok).toBe(true)
    expect(bridge.isReady.value).toBe(true)
    expect(bridge.error.value).toBeNull()
    expect(bridge.controller.value).not.toBeNull()
  })

  it('call 调用 Python controller 并返回结果', async () => {
    const bridge = useControllerBridge()
    await bridge.load('def controller(state, t): return 0')

    const result = bridge.call(new Float64Array([0.5, 0.1]), 0)
    // mock controller: -10*0.5 - 2*0.1 = -5.2
    expect(result).toBeCloseTo(-5.2)
  })

  it('call 传入正确参数', async () => {
    const { __mockController } = await import('pyodide') as any
    const bridge = useControllerBridge()
    await bridge.load('def controller(state, t): return 0')

    const state = new Float64Array([1, 2, 3])
    bridge.call(state, 1.5)

    expect(__mockController).toHaveBeenCalledWith(state, 1.5)
  })

  it('unload 清除状态', async () => {
    const bridge = useControllerBridge()
    await bridge.load('def controller(state, t): return 0')
    expect(bridge.isReady.value).toBe(true)

    bridge.unload()
    expect(bridge.isReady.value).toBe(false)
    expect(bridge.controller.value).toBeNull()
    expect(bridge.error.value).toBeNull()
  })

  it('controller 运行错误被捕获', async () => {
    const { __mockController } = await import('pyodide') as any
    __mockController.mockImplementationOnce(() => { throw new Error('division by zero') })

    const bridge = useControllerBridge()
    await bridge.load('def controller(state, t): return 0')

    const result = bridge.call(new Float64Array([1]), 0)
    expect(result).toBe(0)
    expect(bridge.error.value).toContain('division by zero')
  })

  it('未定义 controller 函数时报错', async () => {
    const { __mockPyodide } = await import('pyodide') as any
    __mockPyodide.globals.get.mockImplementationOnce((name: string) => {
      if (name === 'controller') throw new Error("NameError: name 'controller' is not defined")
      return undefined
    })

    const bridge = useControllerBridge()
    const ok = await bridge.load('print("hello")')
    expect(ok).toBe(false)
    expect(bridge.error.value).toContain('controller')
    expect(bridge.isReady.value).toBe(false)
  })
})

import { shallowRef, ref } from 'vue'
import { usePyodide } from './usePyodide'
import { appendOutput } from './useSimulationState'

/** 从 Python 代码中提取的 controller 函数 */
export type ControllerFn = (state: Float64Array, t: number) => number

/**
 * Controller 桥接 — 模块级单例。
 * 加载用户 Python 代码，提取 controller 函数供仿真引擎调用。
 *
 * 用户代码必须定义 `controller(state, t)` 函数：
 *   - state: Float64Array 状态向量
 *   - t: number 当前仿真时间
 *   - 返回: number 控制输入
 */

const pyodide = usePyodide()
const controller = shallowRef<ControllerFn | null>(null)
const error = ref<string | null>(null)
const isReady = ref(false)

/**
 * 加载 Python 代码并提取 controller 函数。
 * 重复调用会替换之前的 controller。
 */
async function load(code: string): Promise<boolean> {
  error.value = null
  controller.value = null
  isReady.value = false

  // 确保 Pyodide 已初始化
  if (!pyodide.isReady.value) {
    await pyodide.init()
  }
  if (!pyodide.isReady.value) {
    error.value = pyodide.error.value ?? 'Pyodide 加载失败'
    return false
  }

  const py = pyodide.pyodide.value

  // 执行用户代码（顶层 print 输出在 result 中）
  const result = await pyodide.runPythonAsync(code)

  // 顶层输出
  if (result.error) {
    error.value = result.error
    appendOutput({ type: 'error', text: result.error })
    return false
  }

  // 设置全局 stdout/stderr 捕获（放在 runPythonAsync 之后，避免被覆盖）
  // 仿真循环中 controller 的 print() 会通过这里进入 outputHistory
  if (py) {
    py.setStdout({ batched: (s: string) => appendOutput({ type: 'stdout', text: s }) })
    py.setStderr({ batched: (s: string) => appendOutput({ type: 'stderr', text: s }) })
  }

  // 提取 controller 函数
  if (!py) {
    error.value = 'Pyodide 实例不可用'
    appendOutput({ type: 'error', text: 'Pyodide 实例不可用' })
    return false
  }

  try {
    const fn = py.globals.get('controller')
    if (typeof fn !== 'function') {
      const msg = '未找到 controller 函数，请确保定义了 def controller(state, t): ...'
      error.value = msg
      appendOutput({ type: 'error', text: msg })
      return false
    }

    // 包装：JS Float64Array → Python list，Python result → JS number
    controller.value = (state: Float64Array, t: number): number => {
      const pyResult = fn(state, t)
      return Number(pyResult)
    }
    isReady.value = true
    return true
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
    return false
  }
}

/**
 * 调用 controller 函数。
 * 未加载时返回 0（安全默认值）。
 */
function call(state: Float64Array, t: number): number {
  if (!controller.value) return 0
  try {
    return controller.value(state, t)
  } catch (e) {
    const msg = `controller 运行错误: ${e instanceof Error ? e.message : String(e)}`
    error.value = msg
    appendOutput({ type: 'error', text: msg })
    return 0
  }
}

function unload() {
  controller.value = null
  isReady.value = false
  error.value = null
}

export function useControllerBridge() {
  return {
    controller,
    error,
    isReady,
    load,
    call,
    unload,
    isPyodideReady: pyodide.isReady,
    isPyodideLoading: pyodide.isLoading,
  }
}

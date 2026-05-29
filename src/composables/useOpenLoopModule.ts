import { usePyodide } from './usePyodide'
import openloopCode from '@/python/openloop.py?raw'

const pyodide = usePyodide()
let injected = false

/**
 * 注入 openloop 模块到 Pyodide 全局命名空间。
 * 在仿真启动前调用一次。
 */
export async function injectOpenLoop() {
  if (injected) return
  if (!pyodide.isReady.value) {
    await pyodide.init()
  }
  if (!pyodide.isReady.value) return

  // 执行 openloop.py，定义函数到 globals
  const r1 = pyodide.runPython(openloopCode)
  if (r1.error) {
    console.error('openloop 模块注入失败:', r1.error)
    return
  }

  // 创建 openloop 模块对象并注册到 sys.modules，
  // 让用户能 import openloop / import openloop as ol / from openloop import parameter
  const r2 = pyodide.runPython(`
import sys as _ol_sys, types as _ol_types
openloop = _ol_types.ModuleType('openloop')
openloop.parameter = parameter
openloop.status = status
_ol_sys.modules['openloop'] = openloop
del _ol_types
`)
  if (r2.error) {
    console.error('openloop 模块注册失败:', r2.error)
    return
  }

  injected = true
}

/** 将滑块值写入 openloop 的 _params dict */
export function updateParamValues(values: Record<string, number>) {
  const py = pyodide.pyodide.value
  if (!py) return
  const setParams = py.globals.get('_set_params')
  if (!setParams) return
  const pyDict = py.toPy(values)
  setParams(pyDict)
  pyDict.destroy()
  setParams.destroy()
}

/** 读取 openloop 的 _status dict */
export function getStatusValues(): Record<string, number> {
  const py = pyodide.pyodide.value
  if (!py) return {}
  const getStatus = py.globals.get('_get_status')
  if (!getStatus) return {}
  const result = getStatus()
  const jsResult = result.toJs({ dict_converter: Object.fromEntries }) as Record<string, number>
  result.destroy()
  getStatus.destroy()
  return jsResult
}

/** 清空参数和状态 */
export function clearOpenLoop() {
  const py = pyodide.pyodide.value
  if (!py) return
  const clear = py.globals.get('_clear')
  if (!clear) return
  clear()
  clear.destroy()
}

/** 重置注入状态（测试用） */
export function resetOpenLoopModule() {
  injected = false
}

export function useOpenLoopModule() {
  return {
    injectOpenLoop,
    updateParamValues,
    getStatusValues,
    clearOpenLoop,
    resetOpenLoopModule,
  }
}

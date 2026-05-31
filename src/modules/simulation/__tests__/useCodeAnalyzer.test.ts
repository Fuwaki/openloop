import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock analyzer.py?raw
vi.mock('@/python/analyzer.py?raw', () => ({
  default: '# mock analyzer code',
}))

// Mock pyodide module
vi.mock('pyodide', () => {
  const checkSyntax = Object.assign(vi.fn((code: string) => {
    const errors: { line: number; col: number; message: string }[] = []
    if (code.includes('syntax error!')) {
      errors.push({ line: 1, col: 0, message: 'invalid syntax' })
    }
    return {
      toJs: () => (errors.length > 0 ? { ok: false, errors } : { ok: true }),
      destroy: vi.fn(),
    }
  }), { destroy: vi.fn() })

  const detectOlCalls = Object.assign(vi.fn((code: string) => {
    const calls: { name: string; args: unknown[]; kwargs: Record<string, unknown>; line: number; col: number; end_col: number }[] = []
    const lines = code.split('\n')

    // Simulate import detection
    let dottedAlias: string | null = null
    const bareCallers = new Map<string, string>()  // localName → canonicalName

    for (const line of lines) {
      // import openloop as X
      let m = line.match(/import\s+openloop\s+as\s+(\w+)/)
      if (m) { dottedAlias = m[1]; continue }
      // import openloop
      m = line.match(/^import\s+openloop\s*$/)
      if (m) { dottedAlias = 'openloop'; continue }
      // from openloop import X [, Y]
      m = line.match(/from\s+openloop\s+import\s+(.+)/)
      if (m) {
        for (const part of m[1].split(',')) {
          const p = part.trim()
          const asMatch = p.match(/(\w+)\s+as\s+(\w+)/)
          if (asMatch && (asMatch[1] === 'parameter' || asMatch[1] === 'status')) {
            bareCallers.set(asMatch[2], `openloop.${asMatch[1]}`)
          } else if (p === 'parameter' || p === 'status') {
            bareCallers.set(p, `openloop.${p}`)
          }
        }
      }
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      // Dotted: alias.parameter() / alias.status()
      if (dottedAlias) {
        const re = new RegExp(`(?:^|[^\\w.])${dottedAlias}\\.(parameter|status)\\(([^)]*)\\)`, 'g')
        let match
        while ((match = re.exec(line)) !== null) {
          const name = `openloop.${match[1]}`
          const rawArgs = match[2].trim()
          const args = rawArgs
            ? rawArgs.split(',').map((a) => { const t = a.trim(); const n = Number(t); return Number.isNaN(n) ? t.replace(/['"]/g, '') : n })
            : []
          const col = match.index + match[0].indexOf(match[1]) - dottedAlias.length - 1
          const endCol = match.index + match[0].length
          calls.push({ name, args, kwargs: {}, line: i + 1, col, end_col: endCol })
        }
      }

      // Bare: parameter() / status()
      for (const [localName, canonicalName] of bareCallers) {
        const re = new RegExp(`(?:^|[^\\w.])${localName}\\(([^)]*)\\)`, 'g')
        let match
        while ((match = re.exec(line)) !== null) {
          const rawArgs = match[1].trim()
          const args = rawArgs
            ? rawArgs.split(',').map((a) => { const t = a.trim(); const n = Number(t); return Number.isNaN(n) ? t.replace(/['"]/g, '') : n })
            : []
          const col = match.index + match[0].indexOf(localName)
          const endCol = match.index + match[0].length
          calls.push({ name: canonicalName, args, kwargs: {}, line: i + 1, col, end_col: endCol })
        }
      }
    }

    return { toJs: () => ({ calls }), destroy: vi.fn() }
  }), { destroy: vi.fn() })

  const detectController = Object.assign(vi.fn((code: string) => {
    const match = code.match(/def\s+controller\s*\(([^)]*)\)/)
    if (!match) return { toJs: () => ({ found: false, params: [], line: 0 }), destroy: vi.fn() }
    const params = match[1].split(',').map((p) => p.trim()).filter(Boolean)
    const lineNum = code.split('\n').findIndex((l) => l.includes('def controller')) + 1
    return { toJs: () => ({ found: true, params, line: lineNum || 1 }), destroy: vi.fn() }
  }), { destroy: vi.fn() })

  const mockGlobals = new Map<string, unknown>([
    ['check_syntax', checkSyntax],
    ['detect_ol_calls', detectOlCalls],
    ['detect_controller', detectController],
  ])

  const mockPyodide = {
    runPython: vi.fn(),
    runPythonAsync: vi.fn(async () => ({ result: null, stdout: '', stderr: '', error: null })),
    loadPackage: vi.fn(() => Promise.resolve()),
    setStdout: vi.fn(),
    setStderr: vi.fn(),
    globals: {
      get: vi.fn((name: string) => mockGlobals.get(name)),
    },
  }

  return {
    loadPyodide: vi.fn(() => Promise.resolve(mockPyodide)),
  }
})

import { useCodeAnalyzer, resetAnalyzer } from '../analyzer'
import { usePyodide } from '@/modules/python/pyodide'

describe('useCodeAnalyzer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    usePyodide().reset()
    resetAnalyzer()
  })

  it('正确代码返回无语法错误', async () => {
    const { analyze } = useCodeAnalyzer()
    const result = await analyze('x = 1\nprint(x)')
    expect(result.syntaxErrors).toEqual([])
  })

  it('语法错误代码返回错误信息', async () => {
    const { analyze } = useCodeAnalyzer()
    const result = await analyze('syntax error!')
    expect(result.syntaxErrors.length).toBeGreaterThan(0)
    expect(result.syntaxErrors[0].message).toBe('invalid syntax')
  })

  it('检测 import openloop as ol 的调用', async () => {
    const { analyze } = useCodeAnalyzer()
    const code = [
      'import openloop as ol',
      'ol.parameter(1.0)',
      'ol.status("running")',
    ].join('\n')
    const result = await analyze(code)
    expect(result.olCalls.length).toBe(2)
    expect(result.olCalls[0].name).toBe('openloop.parameter')
    expect(result.olCalls[0].args).toEqual([1.0])
    expect(result.olCalls[1].name).toBe('openloop.status')
    expect(result.olCalls[1].args).toEqual(['running'])
  })

  it('检测 import openloop 的调用', async () => {
    const { analyze } = useCodeAnalyzer()
    const code = [
      'import openloop',
      'openloop.parameter(2.0)',
      'openloop.status("ok")',
    ].join('\n')
    const result = await analyze(code)
    expect(result.olCalls.length).toBe(2)
    expect(result.olCalls[0].name).toBe('openloop.parameter')
    expect(result.olCalls[1].name).toBe('openloop.status')
  })

  it('检测 from openloop import 的裸调用', async () => {
    const { analyze } = useCodeAnalyzer()
    const code = [
      'from openloop import parameter, status',
      'parameter(3.0)',
      'status("done")',
    ].join('\n')
    const result = await analyze(code)
    expect(result.olCalls.length).toBe(2)
    expect(result.olCalls[0].name).toBe('openloop.parameter')
    expect(result.olCalls[1].name).toBe('openloop.status')
  })

  it('无 ol 调用时返回空数组', async () => {
    const { analyze } = useCodeAnalyzer()
    const result = await analyze('x = 1 + 2')
    expect(result.olCalls).toEqual([])
  })

  it('检测 controller 函数定义', async () => {
    const { analyze } = useCodeAnalyzer()
    const result = await analyze('def controller(state, t):\n    return 0')
    expect(result.controller.found).toBe(true)
    expect(result.controller.params).toEqual(['state', 't'])
    expect(result.controller.line).toBe(1)
  })

  it('无 controller 函数时 found 为 false', async () => {
    const { analyze } = useCodeAnalyzer()
    const result = await analyze('def other():\n    pass')
    expect(result.controller.found).toBe(false)
    expect(result.controller.params).toEqual([])
    expect(result.controller.line).toBe(0)
  })

  it('init 失败时返回 Pyodide 未就绪错误', async () => {
    const { loadPyodide } = await import('pyodide')
    vi.mocked(loadPyodide).mockRejectedValueOnce(new Error('network error'))

    const { analyze } = useCodeAnalyzer()
    const result = await analyze('x = 1')
    expect(result.syntaxErrors.length).toBeGreaterThan(0)
    expect(result.syntaxErrors[0].message).toContain('Pyodide')
  })
})

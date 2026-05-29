import type { SandboxFrame, SandboxScene } from '../types'

export function createFirstOrderScene(frame: SandboxFrame, params?: Record<string, number>): SandboxScene {
  const x = frame.state.x ?? 0
  const u = frame.state.u ?? 0
  const K = params?.K ?? 1.0

  // 液位映射：x 归一化到 0~1（以 K*u 的典型范围为参考）
  const ref = Math.max(Math.abs(K), 0.1)
  const level = Math.max(0, Math.min(1, x / ref))

  return {
    id: 'first-order',
    title: '一阶系统',
    camera: { center: { x: 0.3, y: 0.5 }, scale: 170 },
    objects: [
      { id: 'ground', kind: 'ground', data: { y: 0, xMin: -0.6, xMax: 1.2, tick: 0.18 } },
      { id: 'tank', kind: 'tank', data: { center: { x: 0.3, y: 0.65 }, size: { x: 0.5, y: 1.0 }, level, label: 'x' } },
    ],
    annotations: [
      { id: 'x-label', kind: 'scalarLabel', data: { position: { x: 0.75, y: 1.3 }, label: 'x =', value: x.toFixed(3) } },
      { id: 'u-label', kind: 'scalarLabel', data: { position: { x: -0.55, y: 0.7 }, label: 'u =', value: u.toFixed(3) } },
    ],
    legend: [
      { id: 'tank', label: '液位', color: 0x10b981 },
    ],
  }
}

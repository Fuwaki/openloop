import type { SandboxFrame, SandboxScene } from '../types'

export function createTankLevelScene(frame: SandboxFrame, params?: Record<string, number>): SandboxScene {
  const h = frame.state.h ?? 0
  const u = frame.state.u ?? 0

  const level = Math.min(Math.max(h / 1.0, 0), 1)

  return {
    id: 'tank-level',
    title: '液位水箱',
    camera: { center: { x: 0.3, y: 0.5 }, scale: 170 },
    objects: [
      { id: 'ground', kind: 'ground', data: { y: 0, xMin: -0.6, xMax: 1.2, tick: 0.18 } },
      { id: 'tank', kind: 'tank', data: { center: { x: 0, y: 0.5 }, size: { x: 0.6, y: 0.8 }, level, label: 'h' } },
    ],
    annotations: [
      { id: 'h-label', kind: 'scalarLabel', data: { position: { x: 0.55, y: 1.1 }, label: 'h =', value: h.toFixed(3) } },
      { id: 'u-label', kind: 'scalarLabel', data: { position: { x: -0.55, y: 0.7 }, label: 'u =', value: u.toFixed(3) } },
    ],
    legend: [
      { id: 'tank', label: '液位', color: 0x10b981 },
    ],
  }
}

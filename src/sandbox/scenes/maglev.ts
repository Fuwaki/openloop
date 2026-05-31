import type { SandboxFrame, SandboxScene } from '../types'

export function createMaglevScene(frame: SandboxFrame, params?: Record<string, number>): SandboxScene {
  const y = frame.state.y ?? 0.7
  const i = frame.state.i ?? 0
  const y_eq = params?.y_eq ?? 0.5

  const magnetCenter = { x: 0, y: 1.0 }
  const magnetSize = { x: 0.6, y: 0.2 }
  const ballCenter = { x: 0, y }
  const ballRadius = 0.08

  return {
    id: 'maglev',
    title: '磁悬浮',
    camera: { center: { x: 0, y: 0.6 }, scale: 140 },
    objects: [
      { id: 'ground', kind: 'ground', data: { y: 0, xMin: -1.2, xMax: 1.2, tick: 0.25 } },
      { id: 'magnet', kind: 'block', data: { center: magnetCenter, size: magnetSize } },
      { id: 'ball', kind: 'ball', data: { center: ballCenter, radius: ballRadius } },
    ],
    annotations: [
      { id: 'y-label', kind: 'scalarLabel', data: { position: { x: 0.35, y: 1.3 }, label: 'y =', value: `${y.toFixed(3)} m` } },
      { id: 'i-label', kind: 'scalarLabel', data: { position: { x: 0.35, y: 1.05 }, label: 'i =', value: `${i.toFixed(2)} A` } },
      { id: 'eq-label', kind: 'scalarLabel', data: { position: { x: 0.35, y: y_eq + 0.06 }, label: 'y_eq =', value: `${y_eq.toFixed(2)} m` } },
    ],
    legend: [
      { id: 'magnet', label: '电磁铁', color: 0xd6e2dc },
      { id: 'ball', label: '悬浮球', color: 0xb9c7c0 },
      { id: 'height', label: '高度', color: 0x10b981 },
      { id: 'current', label: '电流', color: 0xd8a657 },
    ],
  }
}

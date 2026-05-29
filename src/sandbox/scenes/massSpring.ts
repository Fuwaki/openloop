import type { SandboxFrame, SandboxScene } from '../types'

export function createMassSpringScene(frame: SandboxFrame): SandboxScene {
  const x = frame.state.x ?? 0.35
  const v = frame.state.v ?? 0
  const force = frame.state.force ?? -0.35
  const blockCenter = { x, y: 0.28 }

  return {
    id: 'mass-spring',
    title: '质量-弹簧沙盒',
    camera: { center: { x: 0.45, y: 0.42 }, scale: 170 },
    objects: [
      { id: 'ground', kind: 'ground', data: { y: 0, xMin: -1.1, xMax: 2.1, tick: 0.18 } },
      { id: 'anchor', kind: 'joint', data: { center: { x: -0.85, y: 0.28 }, radius: 0.07 } },
      { id: 'spring', kind: 'spring', data: { start: { x: -0.78, y: 0.28 }, end: { x: x - 0.22, y: 0.28 }, coils: 9 } },
      { id: 'block', kind: 'block', data: { center: blockCenter, size: { x: 0.44, y: 0.36 }, label: 'm' } },
      { id: 'pendulum-link', kind: 'link', data: { start: { x: 1.18, y: 0.92 }, end: { x: 1.42, y: 0.38 }, width: 4 } },
      { id: 'pendulum-joint', kind: 'joint', data: { center: { x: 1.18, y: 0.92 }, radius: 0.055 } },
      { id: 'pendulum-ball', kind: 'ball', data: { center: { x: 1.42, y: 0.38 }, radius: 0.11, label: 'b' } },
    ],
    annotations: [
      { id: 'force', kind: 'vector', data: { origin: { x: x + 0.22, y: 0.38 }, vector: { x: force, y: 0 }, label: 'F', scale: 0.75 } },
      { id: 'velocity', kind: 'vector', data: { origin: { x, y: 0.58 }, vector: { x: v, y: 0 }, label: 'v', color: 0x9fb7ad, scale: 0.55 } },
      { id: 'x-label', kind: 'scalarLabel', data: { position: { x: -0.2, y: 0.78 }, label: 'x =', value: `${x.toFixed(2)} m` } },
    ],
    legend: [
      { id: 'spring', label: '弹簧', color: 0xb9c7c0 },
      { id: 'body', label: '被控对象', color: 0xd6e2dc },
      { id: 'force', label: '力向量', color: 0x10b981 },
      { id: 'velocity', label: '速度', color: 0x9fb7ad },
    ],
  }
}

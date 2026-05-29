import type { SandboxFrame, SandboxScene } from '../types'

export function createMassSpringScene(frame: SandboxFrame): SandboxScene {
  const x = frame.state.x ?? 0.35
  const v = frame.state.v ?? 0
  const force = frame.state.F ?? 0
  const blockSize = { x: 0.44, y: 0.36 }
  const blockCenter = { x, y: 0.3 }
  const blockLeft = x - blockSize.x / 2
  const blockRight = x + blockSize.x / 2
  const anchorX = -0.78
  const springY = blockCenter.y
  const forceVector = signedDisplayVector(force, 0.08, 0.38)
  const velocityVector = signedDisplayVector(v, 0.35, 0.34)
  const forceSign = Math.sign(forceVector) || 1
  const velocitySign = Math.sign(velocityVector) || 1

  return {
    id: 'mass-spring',
    title: '质量-弹簧沙盒',
    camera: { center: { x: 0.08, y: 0.42 }, scale: 190 },
    objects: [
      { id: 'ground', kind: 'ground', data: { y: 0, xMin: -1.05, xMax: 1.25, tick: 0.18 } },
      { id: 'wall', kind: 'block', data: { center: { x: -0.92, y: 0.32 }, size: { x: 0.12, y: 0.62 } } },
      { id: 'anchor', kind: 'joint', data: { center: { x: anchorX, y: springY }, radius: 0.045 } },
      { id: 'spring', kind: 'spring', data: { start: { x: anchorX, y: springY }, end: { x: blockLeft, y: springY }, coils: 9, amplitude: 0.07 } },
      { id: 'block', kind: 'block', data: { center: blockCenter, size: blockSize } },
    ],
    annotations: [
      {
        id: 'force',
        kind: 'vector',
        visible: Math.abs(forceVector) > 0.02,
        data: {
          origin: { x: forceSign > 0 ? blockRight + 0.04 : blockLeft - 0.04, y: blockCenter.y },
          vector: { x: forceVector, y: 0 },
        },
      },
      {
        id: 'velocity',
        kind: 'vector',
        visible: Math.abs(velocityVector) > 0.02,
        data: {
          origin: { x: velocitySign > 0 ? x - 0.1 : x + 0.1, y: blockCenter.y + blockSize.y / 2 + 0.15 },
          vector: { x: velocityVector, y: 0 },
          color: 0x9fb7ad,
        },
      },
      { id: 'x-label', kind: 'scalarLabel', data: { position: { x: -0.18, y: 0.82 }, label: 'x =', value: `${x.toFixed(2)} m` } },
    ],
    legend: [
      { id: 'spring', label: '弹簧', color: 0xb9c7c0 },
      { id: 'body', label: '被控对象', color: 0xd6e2dc },
      { id: 'force', label: '力向量', color: 0x10b981 },
      { id: 'velocity', label: '速度', color: 0x9fb7ad },
    ],
  }
}

function signedDisplayVector(value: number, gain: number, maxLength: number): number {
  if (!Number.isFinite(value)) return 0
  const magnitude = Math.min(Math.abs(value) * gain, maxLength)
  return Math.sign(value) * magnitude
}

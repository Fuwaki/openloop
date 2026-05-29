import type { SandboxFrame, SandboxScene } from '../types'

export function createInvertedPendulumScene(frame: SandboxFrame, params?: Record<string, number>): SandboxScene {
  const x = frame.state.x ?? 0
  const v = frame.state.v ?? 0
  const theta = frame.state['θ'] ?? frame.state.theta ?? 0
  const omega = frame.state['ω'] ?? frame.state.omega ?? 0
  const F = frame.state.F ?? 0
  const l = params?.l ?? 0.3

  const carY = 0.28
  const carH = 0.36
  const carW = 0.5
  const carTop = carY + carH / 2
  const rodLength = 2 * l
  const cartLeft = x - carW / 2
  const cartRight = x + carW / 2
  const forceVector = signedDisplayVector(F, 0.08, 0.42)
  const velocityVector = signedDisplayVector(v, 0.34, 0.34)
  const forceSign = Math.sign(forceVector) || 1
  const velocitySign = Math.sign(velocityVector) || 1

  // 摆杆末端
  const tipX = x + rodLength * Math.sin(theta)
  const tipY = carTop + rodLength * Math.cos(theta)
  const tipVelocity = {
    x: rodLength * omega * Math.cos(theta),
    y: -rodLength * omega * Math.sin(theta),
  }
  const tipVelocityScale = clampVectorMagnitude(tipVelocity, 0.16)

  return {
    id: 'inverted-pendulum',
    title: '倒立摆',
    camera: { center: { x: 0, y: 0.6 }, scale: 140 },
    objects: [
      { id: 'ground', kind: 'ground', data: { y: 0, xMin: -2, xMax: 2, tick: 0.25 } },
      { id: 'cart', kind: 'block', data: { center: { x, y: carY }, size: { x: carW, y: carH } } },
      { id: 'pivot', kind: 'joint', data: { center: { x, y: carTop }, radius: 0.05 } },
      { id: 'rod', kind: 'link', data: { start: { x, y: carTop }, end: { x: tipX, y: tipY }, width: 4 } },
      { id: 'tip', kind: 'ball', data: { center: { x: tipX, y: tipY }, radius: 0.08 } },
    ],
    annotations: [
      {
        id: 'force',
        kind: 'vector',
        visible: Math.abs(forceVector) > 0.02,
        data: {
          origin: { x: forceSign > 0 ? cartRight + 0.05 : cartLeft - 0.05, y: carY },
          vector: { x: forceVector, y: 0 },
        },
      },
      {
        id: 'cart-velocity',
        kind: 'vector',
        visible: Math.abs(velocityVector) > 0.02,
        data: {
          origin: { x: velocitySign > 0 ? x - 0.12 : x + 0.12, y: carTop + 0.16 },
          vector: { x: velocityVector, y: 0 },
          color: 0x9fb7ad,
        },
      },
      {
        id: 'tip-velocity',
        kind: 'vector',
        visible: Math.hypot(tipVelocityScale.x, tipVelocityScale.y) > 0.02,
        data: {
          origin: { x: tipX, y: tipY },
          vector: tipVelocityScale,
          color: 0xd8a657,
        },
      },
      { id: 'x-label', kind: 'scalarLabel', data: { position: { x: -1.8, y: 1.4 }, label: 'x =', value: `${x.toFixed(2)} m` } },
      { id: 'theta-label', kind: 'scalarLabel', data: { position: { x: -1.8, y: 1.15 }, label: 'θ =', value: `${(theta * 180 / Math.PI).toFixed(1)}°` } },
    ],
    legend: [
      { id: 'cart', label: '小车', color: 0xd6e2dc },
      { id: 'pendulum', label: '摆杆', color: 0xb9c7c0 },
      { id: 'force', label: '力', color: 0x10b981 },
      { id: 'cart-velocity', label: '小车速度', color: 0x9fb7ad },
      { id: 'tip-velocity', label: '摆端速度', color: 0xd8a657 },
    ],
  }
}

function signedDisplayVector(value: number, gain: number, maxLength: number): number {
  if (!Number.isFinite(value)) return 0
  const magnitude = Math.min(Math.abs(value) * gain, maxLength)
  return Math.sign(value) * magnitude
}

function clampVectorMagnitude(vector: { x: number; y: number }, maxLength: number): { x: number; y: number } {
  const length = Math.hypot(vector.x, vector.y)
  if (length < 1e-6) return { x: 0, y: 0 }
  const scale = Math.min(1, maxLength / length)
  return {
    x: vector.x * scale,
    y: vector.y * scale,
  }
}

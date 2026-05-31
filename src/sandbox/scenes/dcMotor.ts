import type { SandboxFrame, SandboxScene } from '../types'

export function createDcMotorScene(frame: SandboxFrame, _params?: Record<string, number>): SandboxScene {
  const theta = frame.state.theta ?? 0
  const omega = frame.state.omega ?? 0
  const i = frame.state.i ?? 0

  // 电机几何
  const motorX = 0
  const motorY = 0.3
  const motorW = 0.5
  const motorH = 0.4
  const shaftLength = 0.4

  // 转轴末端
  const tipX = motorX + shaftLength * Math.sin(theta)
  const tipY = motorY + shaftLength * Math.cos(theta)

  // 显示用向量缩放
  const omegaVector = signedDisplayVector(omega, 0.15, 0.35)

  return {
    id: 'dc-motor',
    title: '直流电机',
    camera: { center: { x: 0, y: 0.5 }, scale: 160 },
    objects: [
      { id: 'ground', kind: 'ground', data: { y: 0, xMin: -2, xMax: 2, tick: 0.25 } },
      { id: 'motor-body', kind: 'block', data: { center: { x: motorX, y: motorY }, size: { x: motorW, y: motorH } } },
      { id: 'pivot', kind: 'joint', data: { center: { x: motorX, y: motorY }, radius: 0.05 } },
      { id: 'shaft', kind: 'link', data: { start: { x: motorX, y: motorY }, end: { x: tipX, y: tipY }, width: 4 } },
      { id: 'shaft-tip', kind: 'ball', data: { center: { x: tipX, y: tipY }, radius: 0.06 } },
    ],
    annotations: [
      {
        id: 'omega-label',
        kind: 'vector',
        visible: Math.abs(omegaVector) > 0.01,
        data: {
          origin: { x: motorX + 0.35, y: motorY + 0.25 },
          vector: { x: omegaVector, y: 0 },
          color: 0xd8a657,
        },
      },
      { id: 'theta-label', kind: 'scalarLabel', data: { position: { x: -1.8, y: 1.4 }, label: 'θ =', value: `${(theta * 180 / Math.PI).toFixed(1)}°` } },
      { id: 'omega-label-text', kind: 'scalarLabel', data: { position: { x: -1.8, y: 1.15 }, label: 'ω =', value: `${omega.toFixed(2)} rad/s` } },
      { id: 'i-label', kind: 'scalarLabel', data: { position: { x: -1.8, y: 0.9 }, label: 'i =', value: `${i.toFixed(2)} A` } },
    ],
    legend: [
      { id: 'motor', label: '电机', color: 0xd6e2dc },
      { id: 'shaft', label: '转轴', color: 0xb9c7c0 },
      { id: 'omega', label: '角速度', color: 0xd8a657 },
    ],
  }
}

function signedDisplayVector(value: number, gain: number, maxLength: number): number {
  if (!Number.isFinite(value)) return 0
  const magnitude = Math.min(Math.abs(value) * gain, maxLength)
  return Math.sign(value) * magnitude
}

import type { SandboxFrame, SandboxScene } from '../types'

export function createBallAndBeamScene(frame: SandboxFrame, params?: Record<string, number>): SandboxScene {
  const theta = frame.state.theta ?? 0
  const omega = frame.state.omega ?? 0
  const x_b = frame.state.x_b ?? 0.5
  const v_b = frame.state.v_b ?? 0
  const L = params?.L ?? 1.0

  // 支点（世界坐标，Y 向上）
  const pivotX = 0
  const pivotY = 0.6

  // 梁角度: theta > 0 时右侧下沉
  const cosT = Math.cos(theta)
  const sinT = Math.sin(theta)

  // 梁两端
  const leftEndX = pivotX - L * cosT
  const leftEndY = pivotY + L * sinT
  const rightEndX = pivotX + L * cosT
  const rightEndY = pivotY - L * sinT

  // 球在梁上的位置 (x_b 从支点沿梁测量)
  const ballX = pivotX + x_b * cosT
  const ballY = pivotY - x_b * sinT

  // 球速度向量 (沿梁方向 + 垂直梁方向)
  // 沿梁: v_b; 垂直梁分量来自梁旋转
  const v_ball_x = v_b * cosT - x_b * omega * sinT
  const v_ball_y = -v_b * sinT - x_b * omega * cosT
  const v_ball_scaled = clampVectorMagnitude({ x: v_ball_x, y: v_ball_y }, 0.16)

  // tau 力矩显示
  const tau = frame.state.tau ?? 0
  const tauDisplay = signedDisplayVector(tau, 0.15, 0.3)
  const tauSign = Math.sign(tauDisplay) || 1

  return {
    id: 'ball-and-beam',
    title: '球杆系统',
    camera: { center: { x: 0, y: 0.6 }, scale: 140 },
    objects: [
      { id: 'ground', kind: 'ground', data: { y: 0, xMin: -2, xMax: 2, tick: 0.25 } },
      { id: 'pivot', kind: 'joint', data: { center: { x: pivotX, y: pivotY }, radius: 0.05 } },
      { id: 'beam-left', kind: 'link', data: { start: { x: pivotX, y: pivotY }, end: { x: leftEndX, y: leftEndY }, width: 4 } },
      { id: 'beam-right', kind: 'link', data: { start: { x: pivotX, y: pivotY }, end: { x: rightEndX, y: rightEndY }, width: 4 } },
      { id: 'ball', kind: 'ball', data: { center: { x: ballX, y: ballY }, radius: 0.06 } },
    ],
    annotations: [
      {
        id: 'tau',
        kind: 'vector',
        visible: Math.abs(tauDisplay) > 0.02,
        data: {
          origin: {
            x: pivotX + tauSign * 0.08,
            y: pivotY + 0.15,
          },
          vector: { x: 0, y: tauDisplay },
          color: 0x10b981,
        },
      },
      {
        id: 'ball-velocity',
        kind: 'vector',
        visible: Math.hypot(v_ball_scaled.x, v_ball_scaled.y) > 0.02,
        data: {
          origin: { x: ballX, y: ballY },
          vector: v_ball_scaled,
          color: 0xd8a657,
        },
      },
      { id: 'theta-label', kind: 'scalarLabel', data: { position: { x: -1.8, y: 1.4 }, label: 'θ =', value: `${(theta * 180 / Math.PI).toFixed(1)}°` } },
      { id: 'x-label', kind: 'scalarLabel', data: { position: { x: -1.8, y: 1.15 }, label: 'x_b =', value: `${x_b.toFixed(2)} m` } },
    ],
    legend: [
      { id: 'beam', label: '梁', color: 0xb9c7c0 },
      { id: 'ball', label: '球', color: 0xd6e2dc },
      { id: 'tau', label: '力矩', color: 0x10b981 },
      { id: 'ball-velocity', label: '球速度', color: 0xd8a657 },
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

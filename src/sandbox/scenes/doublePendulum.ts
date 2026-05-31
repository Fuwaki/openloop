import type { SandboxFrame, SandboxScene } from '../types'

export function createDoublePendulumScene(frame: SandboxFrame, params?: Record<string, number>): SandboxScene {
  const theta1 = frame.state.theta1 ?? 0
  const theta2 = frame.state.theta2 ?? 0
  const _omega1 = frame.state.omega1 ?? 0
  const _omega2 = frame.state.omega2 ?? 0
  const l1 = params?.l1 ?? 1.0
  const l2 = params?.l2 ?? 1.0

  // 世界坐标系：Y 轴向上
  const pivotX = 0
  const pivotY = 1.0
  const tip1X = pivotX + l1 * Math.sin(theta1)
  const tip1Y = pivotY - l1 * Math.cos(theta1)
  const tip2X = tip1X + l2 * Math.sin(theta2)
  const tip2Y = tip1Y - l2 * Math.cos(theta2)

  return {
    id: 'double-pendulum',
    title: '双摆',
    camera: { center: { x: 0, y: 0.6 }, scale: 100 },
    objects: [
      { id: 'ground', kind: 'ground', data: { y: 0, xMin: -3, xMax: 3, tick: 0.5 } },
      { id: 'pivot', kind: 'joint', data: { center: { x: pivotX, y: pivotY }, radius: 0.05 } },
      { id: 'link1', kind: 'link', data: { start: { x: pivotX, y: pivotY }, end: { x: tip1X, y: tip1Y }, width: 4 } },
      { id: 'ball1', kind: 'ball', data: { center: { x: tip1X, y: tip1Y }, radius: 0.06 } },
      { id: 'link2', kind: 'link', data: { start: { x: tip1X, y: tip1Y }, end: { x: tip2X, y: tip2Y }, width: 4 } },
      { id: 'ball2', kind: 'ball', data: { center: { x: tip2X, y: tip2Y }, radius: 0.06 } },
    ],
    annotations: [
      { id: 'theta1-label', kind: 'scalarLabel', data: { position: { x: -2.5, y: 1.4 }, label: 'theta1 =', value: `${(theta1 * 180 / Math.PI).toFixed(1)} deg` } },
      { id: 'theta2-label', kind: 'scalarLabel', data: { position: { x: -2.5, y: 1.15 }, label: 'theta2 =', value: `${(theta2 * 180 / Math.PI).toFixed(1)} deg` } },
    ],
    legend: [
      { id: 'link1', label: '连杆1', color: 0xb9c7c0 },
      { id: 'link2', label: '连杆2', color: 0xd6e2dc },
      { id: 'ball1', label: '摆球1', color: 0x10b981 },
      { id: 'ball2', label: '摆球2', color: 0xd8a657 },
    ],
  }
}

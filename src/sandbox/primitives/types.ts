import type { Vec2 } from '../types'

export interface GroundData {
  y: number
  xMin: number
  xMax: number
  tick?: number
}

export interface BlockData {
  center: Vec2
  size: Vec2
  angle?: number
  label?: string
}

export interface BallData {
  center: Vec2
  radius: number
  label?: string
}

export interface SpringData {
  start: Vec2
  end: Vec2
  coils?: number
  amplitude?: number
}

export interface LinkData {
  start: Vec2
  end: Vec2
  width?: number
}

export interface JointData {
  center: Vec2
  radius?: number
}

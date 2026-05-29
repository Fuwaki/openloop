import type { Vec2 } from '../types'

export interface VectorData {
  origin: Vec2
  vector: Vec2
  label?: string
  color?: number
  scale?: number
}

export interface ScalarLabelData {
  position: Vec2
  label: string
  value: string
  color?: number
}

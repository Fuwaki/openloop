import type { Container, Graphics } from 'pixi.js'

export interface Vec2 {
  x: number
  y: number
}

export interface SandboxViewport {
  width: number
  height: number
}

export interface SandboxCamera {
  center: Vec2
  scale: number
}

export interface SandboxToggles {
  showGrid: boolean
  showLegend: boolean
  showVectors: boolean
  showLabels: boolean
}

export interface SandboxFrame {
  time: number
  state: Record<string, number>
}

export interface SandboxTheme {
  background: number
  grid: number
  gridMajor: number
  axis: number
  ground: number
  groundStroke: number
  bodyFill: number
  bodyStroke: number
  bodyAccent: number
  ballFill: number
  spring: number
  joint: number
  link: number
  force: number
  velocity: number
  scalar: number
  text: number
  textMuted: number
  panelFill: number
  panelStroke: number
}

export interface RenderContext {
  camera: SandboxCamera
  viewport: SandboxViewport
  theme: SandboxTheme
  toggles: SandboxToggles
  frame: SandboxFrame
  worldToScreen(point: Vec2): Vec2
  screenToWorld(point: Vec2): Vec2
  worldLength(length: number): number
}

export interface Drawable<T = unknown> {
  id: string
  kind: string
  visible?: boolean
  data: T
}

export interface SandboxScene {
  id: string
  title: string
  camera: SandboxCamera
  objects: Drawable[]
  annotations: Drawable[]
  legend: LegendItem[]
}

export interface LegendItem {
  id: string
  label: string
  color: number
}

export type LayerName = 'grid' | 'objects' | 'annotations' | 'overlay'

export interface SandboxLayers {
  grid: Container
  objects: Container
  annotations: Container
  overlay: Container
}

export type DrawFn<T> = (graphics: Graphics, item: Drawable<T>, ctx: RenderContext) => void

import type { RenderContext, SandboxCamera, SandboxFrame, SandboxTheme, SandboxToggles, SandboxViewport, Vec2 } from './types'

export function createRenderContext(
  camera: SandboxCamera,
  viewport: SandboxViewport,
  theme: SandboxTheme,
  toggles: SandboxToggles,
  frame: SandboxFrame,
): RenderContext {
  const cx = viewport.width / 2
  const cy = viewport.height / 2

  return {
    camera,
    viewport,
    theme,
    toggles,
    frame,
    worldToScreen(point: Vec2): Vec2 {
      return {
        x: cx + (point.x - camera.center.x) * camera.scale,
        y: cy - (point.y - camera.center.y) * camera.scale,
      }
    },
    screenToWorld(point: Vec2): Vec2 {
      return {
        x: (point.x - cx) / camera.scale + camera.center.x,
        y: -(point.y - cy) / camera.scale + camera.center.y,
      }
    },
    worldLength(length: number): number {
      return length * camera.scale
    },
  }
}

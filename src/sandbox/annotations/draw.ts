import type { Graphics } from 'pixi.js'
import type { Drawable, RenderContext, Vec2 } from '../types'
import type { VectorData } from './types'

function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y }
}

export function drawVector(g: Graphics, item: Drawable<VectorData>, ctx: RenderContext): void {
  if (!ctx.toggles.showVectors) return

  const data = item.data
  const scale = data.scale ?? 1
  const origin = ctx.worldToScreen(data.origin)
  const end = ctx.worldToScreen(add(data.origin, { x: data.vector.x * scale, y: data.vector.y * scale }))
  const color = data.color ?? ctx.theme.force
  const dx = end.x - origin.x
  const dy = end.y - origin.y
  const len = Math.hypot(dx, dy)
  if (len < 2) return

  const nx = dx / len
  const ny = dy / len
  const head = Math.min(16, Math.max(9, len * 0.22))
  const wing = head * 0.48

  g.moveTo(origin.x, origin.y).lineTo(end.x, end.y).stroke({ color, alpha: 0.82, width: 2 })
  g.poly([
    end.x,
    end.y,
    end.x - nx * head - -ny * wing,
    end.y - ny * head - nx * wing,
    end.x - nx * head + -ny * wing,
    end.y - ny * head + nx * wing,
  ]).fill({ color, alpha: 0.82 })
}

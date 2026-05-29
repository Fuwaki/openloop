import type { Graphics } from 'pixi.js'
import type { Drawable, RenderContext } from '../types'
import type { BallData, BlockData, GroundData, JointData, LinkData, SpringData, TankData } from './types'

export function drawGround(g: Graphics, item: Drawable<GroundData>, ctx: RenderContext): void {
  const data = item.data
  const left = ctx.worldToScreen({ x: data.xMin, y: data.y })
  const right = ctx.worldToScreen({ x: data.xMax, y: data.y })
  const baseY = left.y

  g.moveTo(left.x, baseY).lineTo(right.x, baseY).stroke({ color: ctx.theme.groundStroke, alpha: 0.76, width: 1.5 })
  g.rect(left.x, baseY, right.x - left.x, ctx.worldLength(0.12)).fill({ color: ctx.theme.ground, alpha: 0.32 })

  const tick = data.tick ?? 0.25
  for (let x = data.xMin; x <= data.xMax; x += tick) {
    const p = ctx.worldToScreen({ x, y: data.y })
    g.moveTo(p.x - 6, p.y + 11).lineTo(p.x + 6, p.y).stroke({ color: ctx.theme.groundStroke, alpha: 0.24, width: 1 })
  }
}

export function drawBlock(g: Graphics, item: Drawable<BlockData>, ctx: RenderContext): void {
  const data = item.data
  const center = ctx.worldToScreen(data.center)
  const width = ctx.worldLength(data.size.x)
  const height = ctx.worldLength(data.size.y)
  const x = center.x - width / 2
  const y = center.y - height / 2

  g.roundRect(x + 5, y + 6, width, height, 5).fill({ color: 0x000000, alpha: 0.14 })
  g.roundRect(x, y, width, height, 5)
    .fill({ color: ctx.theme.bodyFill, alpha: 0.72 })
    .stroke({ color: ctx.theme.bodyStroke, alpha: 0.82, width: 1.4 })
  g.roundRect(x + 6, y + 6, width - 12, height - 12, 3)
    .stroke({ color: ctx.theme.bodyStroke, alpha: 0.16, width: 1 })

}

export function drawBall(g: Graphics, item: Drawable<BallData>, ctx: RenderContext): void {
  const data = item.data
  const center = ctx.worldToScreen(data.center)
  const radius = ctx.worldLength(data.radius)

  g.circle(center.x + 4, center.y + 5, radius).fill({ color: 0x000000, alpha: 0.12 })
  g.circle(center.x, center.y, radius)
    .fill({ color: ctx.theme.ballFill, alpha: 0.68 })
    .stroke({ color: ctx.theme.bodyStroke, alpha: 0.82, width: 1.4 })
  g.circle(center.x - radius * 0.26, center.y - radius * 0.3, Math.max(2, radius * 0.16))
    .fill({ color: ctx.theme.bodyStroke, alpha: 0.18 })

}

export function drawSpring(g: Graphics, item: Drawable<SpringData>, ctx: RenderContext): void {
  const data = item.data
  const coils = data.coils ?? 8
  const amplitude = data.amplitude ?? 0.08
  const start = ctx.worldToScreen(data.start)
  const end = ctx.worldToScreen(data.end)
  const dx = end.x - start.x
  const dy = end.y - start.y
  const len = Math.hypot(dx, dy)
  if (len < 1) return

  const nx = dx / len
  const ny = dy / len
  const px = -ny
  const py = nx
  const amp = ctx.worldLength(amplitude)
  const lead = Math.min(ctx.worldLength(0.14), len * 0.18)

  g.moveTo(start.x, start.y).lineTo(start.x + nx * lead, start.y + ny * lead)
  for (let i = 0; i <= coils * 2; i++) {
    const t = i / (coils * 2)
    const centerX = start.x + nx * (lead + (len - lead * 2) * t)
    const centerY = start.y + ny * (lead + (len - lead * 2) * t)
    const sign = i % 2 === 0 ? -1 : 1
    g.lineTo(centerX + px * amp * sign, centerY + py * amp * sign)
  }
  g.lineTo(end.x - nx * lead, end.y - ny * lead).lineTo(end.x, end.y).stroke({ color: ctx.theme.spring, alpha: 0.92, width: 1.8 })
}

export function drawLink(g: Graphics, item: Drawable<LinkData>, ctx: RenderContext): void {
  const data = item.data
  const start = ctx.worldToScreen(data.start)
  const end = ctx.worldToScreen(data.end)
  g.moveTo(start.x, start.y).lineTo(end.x, end.y).stroke({ color: ctx.theme.link, alpha: 0.42, width: data.width ?? 5 })
  g.moveTo(start.x, start.y).lineTo(end.x, end.y).stroke({ color: ctx.theme.bodyStroke, alpha: 0.86, width: 1.4 })
}

export function drawJoint(g: Graphics, item: Drawable<JointData>, ctx: RenderContext): void {
  const data = item.data
  const center = ctx.worldToScreen(data.center)
  const radius = ctx.worldLength(data.radius ?? 0.08)
  g.circle(center.x, center.y, radius)
    .fill({ color: ctx.theme.joint, alpha: 0.7 })
    .stroke({ color: ctx.theme.bodyStroke, alpha: 0.86, width: 1.3 })
  g.circle(center.x, center.y, Math.max(2, radius * 0.34)).fill({ color: ctx.theme.background, alpha: 0.9 })
}

export function drawTank(g: Graphics, item: Drawable<TankData>, ctx: RenderContext): void {
  const data = item.data
  const center = ctx.worldToScreen(data.center)
  const width = ctx.worldLength(data.size.x)
  const height = ctx.worldLength(data.size.y)
  const x = center.x - width / 2
  const y = center.y - height / 2
  const level = Math.max(0, Math.min(1, data.level))

  // 阴影
  g.roundRect(x + 5, y + 6, width, height, 5).fill({ color: 0x000000, alpha: 0.14 })
  // 外框
  g.roundRect(x, y, width, height, 5)
    .fill({ color: ctx.theme.bodyFill, alpha: 0.72 })
    .stroke({ color: ctx.theme.bodyStroke, alpha: 0.82, width: 1.4 })
  // 内框
  g.roundRect(x + 4, y + 4, width - 8, height - 8, 3)
    .stroke({ color: ctx.theme.bodyStroke, alpha: 0.16, width: 1 })

  // 液位填充
  if (level > 0) {
    const fillHeight = (height - 8) * level
    const fillY = y + height - 4 - fillHeight
    g.roundRect(x + 4, fillY, width - 8, fillHeight, 2)
      .fill({ color: ctx.theme.bodyAccent, alpha: 0.45 })
  }

}

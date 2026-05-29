import type { Graphics } from 'pixi.js'
import type { DrawFn, Drawable, RenderContext } from './types'
import { drawVector } from './annotations/draw'
import type { VectorData } from './annotations/types'
import { drawBall, drawBlock, drawGround, drawJoint, drawLink, drawSpring } from './primitives/draw'
import type { BallData, BlockData, GroundData, JointData, LinkData, SpringData } from './primitives/types'

type AnyDrawFn = (graphics: Graphics, item: Drawable, ctx: RenderContext) => void

const registry = new Map<string, AnyDrawFn>()

function register<T>(kind: string, draw: DrawFn<T>) {
  registry.set(kind, draw as AnyDrawFn)
}

register<GroundData>('ground', drawGround)
register<BlockData>('block', drawBlock)
register<BallData>('ball', drawBall)
register<SpringData>('spring', drawSpring)
register<LinkData>('link', drawLink)
register<JointData>('joint', drawJoint)
register<VectorData>('vector', drawVector)

export function drawItem(graphics: Graphics, item: Drawable, ctx: RenderContext): void {
  if (item.visible === false) return
  registry.get(item.kind)?.(graphics, item, ctx)
}

import { Application, Container, Graphics, Text } from 'pixi.js'
import { createRenderContext } from './camera'
import { drawItem } from './drawRegistry'
import { createSandboxTheme } from './theme'
import type { Drawable, RenderContext, SandboxFrame, SandboxLayers, SandboxScene, SandboxTheme, SandboxToggles, SandboxViewport } from './types'
import type { ScalarLabelData } from './annotations/types'

const defaultToggles: SandboxToggles = {
  showGrid: true,
  showLegend: true,
  showVectors: true,
  showLabels: true,
}

export class SandboxRenderer {
  private app: Application | null = null
  private host: HTMLElement | null = null
  private resizeObserver: ResizeObserver | null = null
  private scene: SandboxScene | null = null
  private theme: SandboxTheme = createSandboxTheme()
  private toggles: SandboxToggles = { ...defaultToggles }
  private frame: SandboxFrame = { time: 0, state: {} }
  private viewport: SandboxViewport = { width: 1, height: 1 }
  private layers: SandboxLayers | null = null
  private gridGraphics = new Graphics()
  private objectGraphics = new Graphics()
  private annotationGraphics = new Graphics()
  private overlayContainer = new Container()

  async mount(host: HTMLElement): Promise<void> {
    this.host = host
    this.app = new Application()
    await this.app.init({
      width: Math.max(1, Math.floor(host.clientWidth)),
      height: Math.max(1, Math.floor(host.clientHeight)),
      backgroundColor: this.theme.background,
      antialias: true,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
    })

    this.layers = {
      grid: new Container(),
      objects: new Container(),
      annotations: new Container(),
      overlay: this.overlayContainer,
    }
    this.layers.grid.addChild(this.gridGraphics)
    this.layers.objects.addChild(this.objectGraphics)
    this.layers.annotations.addChild(this.annotationGraphics)
    this.app.stage.addChild(this.layers.grid, this.layers.objects, this.layers.annotations, this.layers.overlay)
    host.appendChild(this.app.canvas)
    this.app.canvas.classList.add('sandbox-canvas')

    this.resizeObserver = new ResizeObserver(() => this.resize())
    this.resizeObserver.observe(host)
    this.resize()
  }

  destroy(): void {
    this.resizeObserver?.disconnect()
    this.resizeObserver = null
    this.app?.destroy({ removeView: true }, { children: true })
    this.app = null
    this.host = null
    this.layers = null
  }

  setScene(scene: SandboxScene): void {
    this.scene = scene
    this.render()
  }

  setFrame(frame: SandboxFrame): void {
    this.frame = frame
    this.render()
  }

  setToggles(toggles: Partial<SandboxToggles>): void {
    this.toggles = { ...this.toggles, ...toggles }
    this.render()
  }

  private resize(): void {
    if (!this.app || !this.host) return
    const width = Math.max(1, Math.floor(this.host.clientWidth))
    const height = Math.max(1, Math.floor(this.host.clientHeight))
    this.viewport = { width, height }
    this.app.renderer.resize(width, height)
    this.render()
  }

  private render(): void {
    if (!this.app || !this.scene) return
    const ctx = createRenderContext(this.scene.camera, this.viewport, this.theme, this.toggles, this.frame)

    this.gridGraphics.clear()
    this.objectGraphics.clear()
    this.annotationGraphics.clear()
    this.overlayContainer.removeChildren()

    if (this.toggles.showGrid) this.drawGrid(this.gridGraphics, ctx)
    for (const item of this.scene.objects) drawItem(this.objectGraphics, item, ctx)
    for (const item of this.scene.annotations) {
      drawItem(this.annotationGraphics, item, ctx)
      if (item.kind === 'scalarLabel' && this.toggles.showLabels) this.drawScalarLabel(item as Drawable<ScalarLabelData>, ctx)
    }
    if (this.toggles.showLegend) this.drawLegend(ctx)
  }

  private drawGrid(g: Graphics, ctx: RenderContext): void {
    const step = 0.25
    const majorEvery = 4
    const topLeft = ctx.screenToWorld({ x: 0, y: 0 })
    const bottomRight = ctx.screenToWorld({ x: ctx.viewport.width, y: ctx.viewport.height })
    const xStart = Math.floor(topLeft.x / step) * step
    const xEnd = Math.ceil(bottomRight.x / step) * step
    const yStart = Math.floor(bottomRight.y / step) * step
    const yEnd = Math.ceil(topLeft.y / step) * step

    let index = 0
    for (let x = xStart; x <= xEnd; x += step) {
      const p0 = ctx.worldToScreen({ x, y: yStart })
      const p1 = ctx.worldToScreen({ x, y: yEnd })
      const major = index % majorEvery === 0
      g.moveTo(p0.x, p0.y).lineTo(p1.x, p1.y).stroke({ color: major ? ctx.theme.gridMajor : ctx.theme.grid, alpha: major ? 0.72 : 0.5, width: major ? 0.8 : 0.5 })
      index += 1
    }

    index = 0
    for (let y = yStart; y <= yEnd; y += step) {
      const p0 = ctx.worldToScreen({ x: xStart, y })
      const p1 = ctx.worldToScreen({ x: xEnd, y })
      const major = index % majorEvery === 0
      g.moveTo(p0.x, p0.y).lineTo(p1.x, p1.y).stroke({ color: major ? ctx.theme.gridMajor : ctx.theme.grid, alpha: major ? 0.72 : 0.5, width: major ? 0.8 : 0.5 })
      index += 1
    }

    const x0 = ctx.worldToScreen({ x: 0, y: yStart })
    const x1 = ctx.worldToScreen({ x: 0, y: yEnd })
    const y0 = ctx.worldToScreen({ x: xStart, y: 0 })
    const y1 = ctx.worldToScreen({ x: xEnd, y: 0 })
    g.moveTo(x0.x, x0.y).lineTo(x1.x, x1.y).stroke({ color: ctx.theme.axis, alpha: 0.72, width: 1 })
    g.moveTo(y0.x, y0.y).lineTo(y1.x, y1.y).stroke({ color: ctx.theme.axis, alpha: 0.72, width: 1 })
  }

  private drawScalarLabel(item: Drawable<ScalarLabelData>, ctx: RenderContext): void {
    const data = item.data
    const pos = ctx.worldToScreen(data.position)
    const text = new Text({
      text: `${data.label} ${data.value}`,
      style: { fontSize: 12, fill: data.color ?? ctx.theme.scalar, fontFamily: 'monospace' },
    })
    text.x = pos.x
    text.y = pos.y
    this.overlayContainer.addChild(text)
  }

  private drawLegend(ctx: RenderContext): void {
    if (!this.scene) return
    const padding = 10
    const rowHeight = 20
    const width = 126
    const height = padding * 2 + this.scene.legend.length * rowHeight
    const x = ctx.viewport.width - width - 12
    const y = 12
    const panel = new Graphics()

    panel.roundRect(x, y, width, height, 6)
      .fill({ color: ctx.theme.panelFill, alpha: 0.72 })
      .stroke({ color: ctx.theme.panelStroke, alpha: 0.9, width: 1 })
    this.overlayContainer.addChild(panel)

    this.scene.legend.forEach((item, index) => {
      const rowY = y + padding + index * rowHeight + 8
      const swatch = new Graphics()
      swatch.moveTo(x + 10, rowY).lineTo(x + 20, rowY).stroke({ color: item.color, alpha: 0.88, width: 2 })
      const label = new Text({
        text: item.label,
        style: { fontSize: 12, fill: ctx.theme.text, fontFamily: 'system-ui, sans-serif' },
      })
      label.x = x + 26
      label.y = rowY - 8
      this.overlayContainer.addChild(swatch, label)
    })
  }
}

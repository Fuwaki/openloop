<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import uPlot from 'uplot'
import 'uplot/dist/uPlot.min.css'
import { useSimulationState } from '@/modules/simulation'
import { useModelLoader } from '@/modules/models'

const { currentPlant } = useModelLoader()
const {
  currentState, currentInput, currentIntermediates,
  controllerStatus, controllerStatusNames,
  solverStats, simulationRunId,
  initHistory, appendHistory, getHistoryBuffer, clearHistory, historyVersion,
} = useSimulationState()

interface SignalDef {
  key: string
  label: string
  source: 'state' | 'input' | 'intermediate' | 'status'
  index: number
  statusName?: string
}

type XMode = 'time' | 'signal'
type Range = [number, number]

const SERIES_COLORS = ['#10b981', '#60a5fa', '#f59e0b', '#ef4444', '#a78bfa', '#22d3ee']
const SCRUBBER_EDGE_PX = 6
const ZOOM_FACTOR = 0.8

const signals = computed<SignalDef[]>(() => {
  const plant = currentPlant.value
  if (!plant) return []

  const list: SignalDef[] = []
  plant.stateVars.forEach((v, i) => {
    list.push({ key: `s_${v.name}`, label: formatSignalLabel(v.name, v.label, v.unit), source: 'state', index: i })
  })
  plant.inputVars.forEach((v, i) => {
    list.push({ key: `i_${v.name}`, label: formatSignalLabel(v.name, v.label, v.unit), source: 'input', index: i })
  })
  plant.intermediateVars.forEach((v, i) => {
    list.push({ key: `m_${v.name}`, label: formatSignalLabel(v.name, v.label, v.unit), source: 'intermediate', index: i })
  })
  const statusNames = statusSignalKey.value ? statusSignalKey.value.split('\x1f') : []
  statusNames.forEach((name) => {
    list.push({ key: `c_${name}`, label: `${name} (controller)`, source: 'status', index: -1, statusName: name })
  })
  return list
})

const xMode = ref<XMode>('time')
const selectedXKey = ref('')
const selectedYKeys = ref<string[]>([])
const yDropdownOpen = ref(false)
const manualYRange = ref<Range | null>(null)
const viewStart = ref(0)
const viewDuration = ref(0) // 0 = full view

const chartAreaRef = ref<HTMLElement>()
const plotHostRef = ref<HTMLElement>()
const canvasRef = ref<HTMLCanvasElement>()
const yDropdownRef = ref<HTMLElement>()
const scrubberRef = ref<HTMLElement>()
const scrubberCanvasRef = ref<HTMLCanvasElement>()
const placeholderCanvasRef = ref<HTMLCanvasElement>()
let plot: uPlot | null = null
let resizeObserver: ResizeObserver | null = null
let scrubberResizeObserver: ResizeObserver | null = null
let historyInitialized = false

type DragMode = 'none' | 'pan' | 'resize-left' | 'resize-right' | 'scrub'
let dragMode: DragMode = 'none'
let dragStartX = 0
let dragStartViewStart = 0
let dragStartViewDuration = 0

const xBuf = computed<number[]>(() => { void historyVersion.value; return getHistoryBuffer('t') })
const statusSignalKey = computed(() => {
  const liveNames = controllerStatus.value.map((s) => s.name)
  const allNames = [...new Set([...controllerStatusNames.value, ...liveNames])]
  return allNames.join('\x1f')
})

function formatSignalLabel(name: string, label: string, unit?: string): string {
  const title = label && label !== name ? `${name} (${label})` : name
  return unit ? `${title} [${unit}]` : title
}

function formatTime(value: number): string {
  if (!Number.isFinite(value)) return '0.000s'
  return `${value.toFixed(value < 10 ? 3 : 2)}s`
}

function findSignal(key: string): SignalDef | undefined {
  return signals.value.find((s) => s.key === key)
}

function getSignalValue(sig: SignalDef): number {
  if (sig.source === 'state') return currentState.value?.[sig.index] ?? 0
  if (sig.source === 'input') return currentInput.value?.[sig.index] ?? 0
  if (sig.source === 'status') return controllerStatus.value.find((s) => s.name === sig.statusName)?.value ?? 0
  return currentIntermediates.value?.[sig.index] ?? 0
}

function getXValue(statsTime: number): number | null {
  if (xMode.value === 'time') return statsTime
  const sig = findSignal(selectedXKey.value)
  return sig ? getSignalValue(sig) : null
}

function syncSelection(nextSignals = signals.value) {
  const validKeys = new Set(nextSignals.map((s) => s.key))

  if (!nextSignals.length) {
    selectedXKey.value = ''
    selectedYKeys.value = []
    return
  }

  if (!selectedXKey.value || !validKeys.has(selectedXKey.value)) {
    selectedXKey.value = nextSignals[0]!.key
  }

  const keptY = selectedYKeys.value.filter((key) => validKeys.has(key))
  if (keptY.length) {
    selectedYKeys.value = keptY
    return
  }

  const firstY = nextSignals.find((s) => s.key !== selectedXKey.value) ?? nextSignals[0]!
  selectedYKeys.value = [firstY.key]
}

const xAxisLabel = computed(() => {
  if (xMode.value === 'time') return 't (s)'
  return findSignal(selectedXKey.value)?.label ?? 'X'
})

const selectedYLabel = computed(() => {
  const selected = selectedYKeys.value
    .map((key) => findSignal(key)?.label)
    .filter((label): label is string => Boolean(label))

  if (!selected.length) return '选择信号'
  if (selected.length === 1) return selected[0]!
  return `${selected.length} 个信号`
})

const dataExtent = computed<Range | null>(() => {
  void historyVersion.value
  const buf = xBuf.value
  if (buf.length < 2) return null
  return [buf[0]!, buf[buf.length - 1]!]
})

const hasData = computed(() => {
  void historyVersion.value
  return xBuf.value.length > 1
})

const hasScrubber = computed(() => xMode.value === 'time' && !!dataExtent.value)

const isFollowingLatest = ref(true)

function checkAutoFollow() {
  const data = dataExtent.value
  if (!data || viewDuration.value <= 0) { isFollowingLatest.value = true; return }
  const epsilon = (data[1] - data[0]) * 0.001
  if (viewStart.value + viewDuration.value >= data[1] - epsilon) {
    isFollowingLatest.value = true
    viewStart.value = Math.max(data[0], data[1] - viewDuration.value)
  }
}

const scrubberViewRange = computed<Range | null>(() => {
  const data = dataExtent.value
  if (!data) return null
  if (viewDuration.value <= 0) return null // full view → autoFit
  const end = Math.min(viewStart.value + viewDuration.value, data[1])
  const start = Math.max(viewStart.value, data[0])
  return [start, end]
})

function makeSeries(): uPlot.Series[] {
  return [
    {},
    ...selectedYKeys.value.map((key, i) => ({
      label: findSignal(key)?.label ?? key,
      stroke: SERIES_COLORS[i % SERIES_COLORS.length],
      width: 2,
      points: { show: false },
    })),
  ]
}

function makeOpts(): uPlot.Options {
  return {
    width: 400,
    height: 200,
    legend: { show: false },
    axes: [
      { stroke: '#888888', grid: { stroke: '#2a2a2a' }, label: xAxisLabel.value },
      { stroke: '#888888', grid: { stroke: '#2a2a2a' } },
    ],
    select: { show: true, left: 0, top: 0, width: 0, height: 0, over: true },
    series: makeSeries(),
    cursor: { drag: { x: true, y: true } },
    hooks: {},
  }
}

function currentData(): uPlot.AlignedData {
  return [
    new Float64Array(xBuf.value),
    ...selectedYKeys.value.map((key) => new Float64Array(getHistoryBuffer(key))),
  ]
}

function syncPlotSize() {
  const { width, height } = chartAreaRef.value?.getBoundingClientRect() ?? { width: 0, height: 0 }
  if (plot) {
    plot.setSize({ width: Math.max(1, Math.floor(width)), height: Math.max(1, Math.floor(height)) })
  }
  renderSignalPlot()
  renderPlaceholder()
}

function rebuildPlot() {
  plot?.destroy()
  plot = null
  if (xMode.value === 'time' && plotHostRef.value && hasData.value) {
    plot = new uPlot(makeOpts(), currentData(), plotHostRef.value)
    syncPlotSize()
    applyViewRange()
    return
  }
  if (xMode.value === 'signal') {
    nextTick(renderSignalPlot)
  }
  nextTick(renderPlaceholder)
}

function updateChart() {
  if (xMode.value === 'time') {
    if (!plot && hasData.value && plotHostRef.value) {
      plot = new uPlot(makeOpts(), currentData(), plotHostRef.value)
      syncPlotSize()
    }
    if (plot) {
      const fullView = viewDuration.value <= 0
      plot.setData(currentData(), fullView || !manualYRange.value)
      if (!fullView) {
        applyViewRange()
      } else if (manualYRange.value) {
        plot.setScale('y', { min: manualYRange.value[0], max: manualYRange.value[1] })
      }
    }
  } else {
    renderSignalPlot()
  }
}

function clearData() {
  clearHistory()
  viewStart.value = 0
  viewDuration.value = 0
  manualYRange.value = null
  updateChart()
  renderScrubber()
}

function resetRunData() {
  historyInitialized = false
  clearData()
  plot?.setSelect({ left: 0, top: 0, width: 0, height: 0 }, false)
}

function onXModeChange(mode: XMode) {
  xMode.value = mode
  clearData()
  nextTick(rebuildPlot)
}

function onXModeSelect(event: Event) {
  onXModeChange((event.target as HTMLSelectElement).value as XMode)
}

function onXSignalChange() {
  if (xMode.value !== 'signal') return
  clearData()
  rebuildPlot()
}

function finiteRange(values: number[]): [number, number] {
  let min = Infinity
  let max = -Infinity
  for (const value of values) {
    if (!Number.isFinite(value)) continue
    min = Math.min(min, value)
    max = Math.max(max, value)
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [-1, 1]
  if (min === max) {
    const pad = Math.abs(min || 1) * 0.1
    return [min - pad, max + pad]
  }
  const pad = (max - min) * 0.08
  return [min - pad, max + pad]
}

function visibleIndices(xRange: Range | null): number[] {
  const buf = xBuf.value
  if (!xRange) return buf.map((_, i) => i)
  const [min, max] = xRange
  const indices: number[] = []
  buf.forEach((value, index) => {
    if (value >= min && value <= max) indices.push(index)
  })
  return indices
}

function rangeForIndices(values: number[], indices: number[]): Range {
  return finiteRange(indices.map((index) => values[index]).filter((value): value is number => value !== undefined))
}

function fullXRange(): Range {
  return finiteRange(xBuf.value)
}

function fullYRange(indices = visibleIndices(currentXRange())): Range {
  const values = selectedYKeys.value.flatMap((key) => {
    const buf = getHistoryBuffer(key)
    return indices.map((index) => buf[index]).filter((value): value is number => value !== undefined)
  })
  return finiteRange(values)
}

function currentXRange(): Range | null {
  return scrubberViewRange.value
}

function currentYRange(xRange = currentXRange()): Range | null {
  if (manualYRange.value) return manualYRange.value
  if (xRange) return fullYRange(visibleIndices(xRange))
  return null
}

function resetView() {
  viewStart.value = 0
  viewDuration.value = 0
  manualYRange.value = null
  isFollowingLatest.value = true
  updateChart()
  renderScrubber()
}

function resetYFit() {
  manualYRange.value = null
  updateChart()
}

function onChartWheel(event: WheelEvent) {
  if (xMode.value !== 'time' || !plot) return
  event.preventDefault()

  // Get current Y range from plot
  const yMin = plot.scales.y?.min
  const yMax = plot.scales.y?.max
  if (typeof yMin !== 'number' || typeof yMax !== 'number') return

  // Cursor Y position in plot coordinates
  const plotRect = plotHostRef.value?.getBoundingClientRect()
  if (!plotRect) return
  const mouseY = event.clientY - plotRect.top
  const plotH = plotRect.height
  const ratio = 1 - (mouseY / plotH) // 0=top, 1=bottom
  const cursorY = yMin + ratio * (yMax - yMin)

  // Zoom centered on cursor
  const factor = event.deltaY > 0 ? 1 / 0.8 : 0.8
  const newMin = cursorY - (cursorY - yMin) * factor
  const newMax = cursorY + (yMax - cursorY) * factor

  manualYRange.value = [newMin, newMax]
  updateChart()
}

// ─── Placeholder ──────────────────────────────────────────────

function renderPlaceholder() {
  const canvas = placeholderCanvasRef.value
  const host = chartAreaRef.value
  if (!canvas || !host) return

  const rect = host.getBoundingClientRect()
  const dpr = window.devicePixelRatio || 1
  const w = Math.max(1, Math.floor(rect.width))
  const h = Math.max(1, Math.floor(rect.height))
  canvas.width = Math.floor(w * dpr)
  canvas.height = Math.floor(h * dpr)
  canvas.style.width = `${w}px`
  canvas.style.height = `${h}px`

  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  const styles = getComputedStyle(document.documentElement)
  const rawVar = (name: string, fallback: string) => styles.getPropertyValue(name).trim() || fallback
  const bg = `rgb(${rawVar('--c-bg-base', '18 18 18')})`
  const grid = `rgb(${rawVar('--c-bg-surface-hover', '42 42 42')})`
  const text = `rgb(${rawVar('--c-text-muted', '136 136 136')})`
  const textDim = `rgb(${rawVar('--c-text-muted', '136 136 136')})`

  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, w, h)

  const pad = { top: 28, right: 20, bottom: 38, left: 56 }
  const plotW = Math.max(1, w - pad.left - pad.right)
  const plotH = Math.max(1, h - pad.top - pad.bottom)

  // Grid
  ctx.strokeStyle = grid
  ctx.lineWidth = 1
  for (let i = 0; i <= 5; i++) {
    const x = pad.left + (plotW * i) / 5
    const y = pad.top + (plotH * i) / 5
    ctx.beginPath()
    ctx.moveTo(x, pad.top)
    ctx.lineTo(x, pad.top + plotH)
    ctx.moveTo(pad.left, y)
    ctx.lineTo(pad.left + plotW, y)
    ctx.stroke()
  }

  // Axes
  ctx.strokeStyle = text
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(pad.left, pad.top)
  ctx.lineTo(pad.left, pad.top + plotH)
  ctx.lineTo(pad.left + plotW, pad.top + plotH)
  ctx.stroke()

  // Tick marks
  ctx.lineWidth = 1
  for (let i = 0; i <= 5; i++) {
    const x = pad.left + (plotW * i) / 5
    const y = pad.top + plotH
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x, y + 4)
    ctx.stroke()
  }
  for (let i = 0; i <= 5; i++) {
    const x = pad.left
    const y = pad.top + plotH - (plotH * i) / 5
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x - 4, y)
    ctx.stroke()
  }

  // Axis labels
  ctx.font = '11px system-ui, -apple-system, sans-serif'
  ctx.fillStyle = text
  ctx.textAlign = 'center'
  ctx.fillText(xAxisLabel.value, pad.left + plotW / 2, h - 8)
  ctx.save()
  ctx.translate(14, pad.top + plotH / 2)
  ctx.rotate(-Math.PI / 2)
  ctx.fillText('信号值', 0, 0)
  ctx.restore()

  // Axis numbers
  ctx.font = '10px system-ui, -apple-system, sans-serif'
  ctx.textAlign = 'center'
  for (let i = 0; i <= 5; i++) {
    const x = pad.left + (plotW * i) / 5
    ctx.fillText((i * 2).toFixed(1), x, pad.top + plotH + 16)
  }
  ctx.textAlign = 'right'
  for (let i = 0; i <= 5; i++) {
    const y = pad.top + plotH - (plotH * i) / 5
    ctx.fillText((i * 0.2).toFixed(1), pad.left - 6, y + 4)
  }

  // Center hint
  ctx.font = '13px system-ui, -apple-system, sans-serif'
  ctx.fillStyle = textDim
  ctx.textAlign = 'center'
  ctx.fillText('运行仿真以查看数据', w / 2, h / 2)
}

// ─── Scrubber ────────────────────────────────────────────────

function scrubberToTime(px: number, width: number): number {
  const data = dataExtent.value
  if (!data || width <= 0) return 0
  return data[0] + (px / width) * (data[1] - data[0])
}

function timeToScrubber(t: number, width: number): number {
  const data = dataExtent.value
  if (!data || data[1] <= data[0]) return 0
  return ((t - data[0]) / (data[1] - data[0])) * width
}

function renderScrubber() {
  const canvas = scrubberCanvasRef.value
  const host = scrubberRef.value
  if (!canvas || !host) return

  const rect = host.getBoundingClientRect()
  const dpr = window.devicePixelRatio || 1
  const w = Math.max(1, Math.floor(rect.width))
  const h = Math.max(1, Math.floor(rect.height))
  canvas.width = Math.floor(w * dpr)
  canvas.height = Math.floor(h * dpr)
  canvas.style.width = `${w}px`
  canvas.style.height = `${h}px`

  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  const styles = getComputedStyle(document.documentElement)
  const rawVar = (name: string, fallback: string) => styles.getPropertyValue(name).trim() || fallback
  const primaryRgb = rawVar('--c-primary', '16 185 129')
  const primaryParts = primaryRgb.split(/[\s/]+/).slice(0, 3).join(', ')
  const trackBg = `rgb(${rawVar('--c-bg-surface', '30 30 30')})`
  const text = `rgb(${rawVar('--c-text-muted', '136 136 136')})`

  ctx.clearRect(0, 0, w, h)

  // Track background
  ctx.fillStyle = trackBg
  ctx.fillRect(0, 0, w, h)

  const data = dataExtent.value
  if (!data || data[1] <= data[0]) return

  const range = scrubberViewRange.value
  const selLeft = range ? timeToScrubber(range[0], w) : 0
  const selRight = range ? timeToScrubber(range[1], w) : w
  const selW = Math.max(4, selRight - selLeft)

  // Selection rectangle
  ctx.fillStyle = `rgba(${primaryParts}, 0.15)`
  ctx.fillRect(selLeft, 0, selW, h)
  ctx.strokeStyle = `rgba(${primaryParts}, 0.7)`
  ctx.lineWidth = 2
  ctx.strokeRect(selLeft + 1, 1, selW - 2, h - 2)

  // Edge handles (only in local mode)
  if (range) {
    const handleW = SCRUBBER_EDGE_PX
    ctx.fillStyle = `rgba(${primaryParts}, 0.5)`
    ctx.fillRect(selLeft, 0, handleW, h)
    ctx.fillRect(selRight - handleW, 0, handleW, h)
  }

  // Time labels
  ctx.font = '10px system-ui, -apple-system, sans-serif'
  ctx.fillStyle = text
  ctx.textAlign = 'left'
  ctx.fillText(formatTime(data[0]), 4, h - 4)
  ctx.textAlign = 'right'
  ctx.fillText(formatTime(data[1]), w - 4, h - 4)
  ctx.textAlign = 'center'
  if (range) {
    ctx.fillText(`${formatTime(range[0])} – ${formatTime(range[1])}`, w / 2, 11)
  } else {
    ctx.fillText('全量', w / 2, 11)
    if (data[1] - data[0] > 10) {
      ctx.font = '9px system-ui, -apple-system, sans-serif'
      ctx.fillStyle = `rgb(${rawVar('--c-text-muted', '136 136 136')})`
      ctx.globalAlpha = 0.6
      ctx.fillText('双击查看最新 10s', w / 2, 22)
      ctx.globalAlpha = 1
    }
  }
}

function getScrubberDragMode(clientX: number): DragMode {
  const canvas = scrubberCanvasRef.value
  if (!canvas) return 'scrub'
  const rect = canvas.getBoundingClientRect()
  const x = clientX - rect.left
  const w = rect.width
  const range = scrubberViewRange.value
  const data = dataExtent.value
  if (!data || w <= 0) return 'scrub'
  const selLeft = range ? timeToScrubber(range[0], w) : 0
  const selRight = range ? timeToScrubber(range[1], w) : w
  if (x >= selLeft - SCRUBBER_EDGE_PX && x <= selLeft + SCRUBBER_EDGE_PX) return 'resize-left'
  if (x >= selRight - SCRUBBER_EDGE_PX && x <= selRight + SCRUBBER_EDGE_PX) return 'resize-right'
  if (x > selLeft && x < selRight) return 'pan'
  return 'scrub'
}

function onScrubberPointerDown(event: PointerEvent) {
  if (event.button !== 0) return
  // Full view: no drag interaction, double-click to enter local mode
  if (viewDuration.value <= 0) return

  const canvas = scrubberCanvasRef.value
  if (!canvas) return
  const rect = canvas.getBoundingClientRect()
  const x = event.clientX - rect.left
  const data = dataExtent.value
  if (!data) return

  dragMode = getScrubberDragMode(event.clientX)
  if (dragMode === 'scrub') return // click outside selection in local mode: no-op
  dragStartX = x
  dragStartViewStart = viewStart.value
  dragStartViewDuration = viewDuration.value
  isFollowingLatest.value = false

  canvas.setPointerCapture(event.pointerId)
  canvas.addEventListener('pointermove', onScrubberPointerMove)
  canvas.addEventListener('pointerup', onScrubberPointerUp)
  canvas.addEventListener('pointercancel', onScrubberPointerUp)
  event.preventDefault()
}

function onScrubberPointerMove(event: PointerEvent) {
  const canvas = scrubberCanvasRef.value
  if (!canvas) return
  const rect = canvas.getBoundingClientRect()
  const x = event.clientX - rect.left
  const w = rect.width
  const data = dataExtent.value
  if (!data || w <= 0) return

  const dx = x - dragStartX
  const dtPerPixel = (data[1] - data[0]) / w

  if (dragMode === 'pan') {
    const delta = dx * dtPerPixel
    const newStart = dragStartViewStart + delta
    const clampedStart = Math.max(data[0], Math.min(newStart, data[1] - dragStartViewDuration))
    viewStart.value = clampedStart
    viewDuration.value = dragStartViewDuration
  } else if (dragMode === 'resize-left') {
    const newStart = scrubberToTime(x, w)
    const end = dragStartViewStart + dragStartViewDuration
    const clampedStart = Math.max(data[0], Math.min(newStart, end - 0.01))
    viewStart.value = clampedStart
    viewDuration.value = end - clampedStart
  } else if (dragMode === 'resize-right') {
    const newEnd = scrubberToTime(x, w)
    const dur = Math.max(0.01, newEnd - dragStartViewStart)
    viewDuration.value = Math.min(dur, data[1] - viewStart.value)
  }

  renderScrubber()
  updateChart()
}

function onScrubberPointerUp(event: PointerEvent) {
  const canvas = scrubberCanvasRef.value
  if (!canvas) return
  canvas.removeEventListener('pointermove', onScrubberPointerMove)
  canvas.removeEventListener('pointerup', onScrubberPointerUp)
  canvas.removeEventListener('pointercancel', onScrubberPointerUp)
  checkAutoFollow()
  renderScrubber()
  dragMode = 'none'
}

function onScrubberWheel(event: WheelEvent) {
  // Full view: no zoom, double-click to enter local mode
  if (viewDuration.value <= 0) return
  event.preventDefault()
  isFollowingLatest.value = false

  const canvas = scrubberCanvasRef.value
  if (!canvas) return
  const rect = canvas.getBoundingClientRect()
  const x = event.clientX - rect.left
  const w = rect.width
  const data = dataExtent.value
  if (!data || w <= 0) return

  const cursorTime = scrubberToTime(x, w)
  const ratio = (cursorTime - viewStart.value) / viewDuration.value
  const factor = event.deltaY > 0 ? 1 / ZOOM_FACTOR : ZOOM_FACTOR
  const newDur = Math.max(0.01, Math.min(viewDuration.value * factor, data[1] - data[0]))
  const newStart = cursorTime - ratio * newDur
  viewStart.value = Math.max(data[0], Math.min(newStart, data[1] - newDur))
  viewDuration.value = newDur

  checkAutoFollow()
  renderScrubber()
  updateChart()
}

function onScrubberDblClick() {
  const data = dataExtent.value
  if (!data) return
  if (viewDuration.value <= 0) {
    // Full → 10s window at the right edge
    const dur = Math.min(10, data[1] - data[0])
    viewDuration.value = dur
    viewStart.value = Math.max(data[0], data[1] - dur)
    isFollowingLatest.value = true
  } else {
    // Local → full view
    viewDuration.value = 0
    viewStart.value = 0
    isFollowingLatest.value = true
  }
  manualYRange.value = null
  updateChart()
  renderScrubber()
}

function onScrubberPointerMoveCursor(event: PointerEvent) {
  if (dragMode !== 'none') return
  const canvas = scrubberCanvasRef.value
  if (!canvas) return
  // Full view: default cursor, no interaction
  if (viewDuration.value <= 0) {
    canvas.style.cursor = 'default'
    return
  }
  const mode = getScrubberDragMode(event.clientX)
  if (mode === 'resize-left' || mode === 'resize-right') {
    canvas.style.cursor = 'ew-resize'
  } else if (mode === 'pan') {
    canvas.style.cursor = 'grab'
  } else {
    canvas.style.cursor = 'default'
  }
}

function applyViewRange() {
  if (!plot || xMode.value !== 'time') return
  const xRange = currentXRange()
  const yRange = currentYRange(xRange)
  plot.batch(() => {
    if (xRange) plot?.setScale('x', { min: xRange[0], max: xRange[1] })
    if (yRange) plot?.setScale('y', { min: yRange[0], max: yRange[1] })
  })
}

function renderSignalPlot() {
  if (xMode.value !== 'signal') return
  const canvas = canvasRef.value
  const area = chartAreaRef.value
  if (!canvas || !area) return

  const rect = area.getBoundingClientRect()
  const dpr = window.devicePixelRatio || 1
  const width = Math.max(1, Math.floor(rect.width))
  const height = Math.max(1, Math.floor(rect.height))
  canvas.width = Math.floor(width * dpr)
  canvas.height = Math.floor(height * dpr)
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`

  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  const styles = getComputedStyle(document.documentElement)
  const rgbVar = (name: string, fallback: string) => {
    const raw = styles.getPropertyValue(name).trim() || fallback
    return raw.includes(' ') ? `rgb(${raw})` : raw
  }
  const bg = rgbVar('--c-bg-base', '18 18 18')
  const grid = rgbVar('--c-bg-surface-hover', '42 42 42')
  const text = rgbVar('--c-text-muted', '136 136 136')
  const textBase = rgbVar('--c-text-base', '229 229 229')

  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, width, height)

  const pad = { top: 22, right: 18, bottom: 34, left: 48 }
  const plotW = Math.max(1, width - pad.left - pad.right)
  const plotH = Math.max(1, height - pad.top - pad.bottom)
  const xRange = currentXRange()
  const visible = visibleIndices(xRange)
  const [xMin, xMax] = xRange ?? rangeForIndices(xBuf.value, visible)
  const [yMin, yMax] = currentYRange(xRange) ?? fullYRange(visible)
  const toX = (v: number) => pad.left + ((v - xMin) / (xMax - xMin)) * plotW
  const toY = (v: number) => pad.top + plotH - ((v - yMin) / (yMax - yMin)) * plotH

  ctx.strokeStyle = grid
  ctx.lineWidth = 1
  ctx.font = '11px system-ui, -apple-system, sans-serif'
  ctx.fillStyle = text
  for (let i = 0; i <= 4; i++) {
    const x = pad.left + (plotW * i) / 4
    const y = pad.top + (plotH * i) / 4
    ctx.beginPath()
    ctx.moveTo(x, pad.top)
    ctx.lineTo(x, pad.top + plotH)
    ctx.moveTo(pad.left, y)
    ctx.lineTo(pad.left + plotW, y)
    ctx.stroke()
  }

  ctx.strokeStyle = text
  ctx.beginPath()
  ctx.moveTo(pad.left, pad.top)
  ctx.lineTo(pad.left, pad.top + plotH)
  ctx.lineTo(pad.left + plotW, pad.top + plotH)
  ctx.stroke()

  ctx.fillStyle = text
  ctx.textAlign = 'center'
  ctx.fillText(xAxisLabel.value, pad.left + plotW / 2, height - 10)
  ctx.textAlign = 'right'
  ctx.fillText(yMax.toPrecision(3), pad.left - 6, pad.top + 4)
  ctx.fillText(yMin.toPrecision(3), pad.left - 6, pad.top + plotH)
  ctx.textAlign = 'left'
  ctx.fillText(xMin.toPrecision(3), pad.left, pad.top + plotH + 16)
  ctx.textAlign = 'right'
  ctx.fillText(xMax.toPrecision(3), pad.left + plotW, pad.top + plotH + 16)

  selectedYKeys.value.forEach((key, seriesIdx) => {
    const ys = getHistoryBuffer(key)
    ctx.strokeStyle = SERIES_COLORS[seriesIdx % SERIES_COLORS.length]!
    ctx.lineWidth = 2
    ctx.beginPath()
    let hasPoint = false
    const buf = xBuf.value
    const len = Math.min(buf.length, ys.length)
    for (let i = 0; i < len; i++) {
      const xValue = buf[i]
      const yValue = ys[i]
      if (xValue === undefined || yValue === undefined) continue
      const x = toX(xValue)
      const y = toY(yValue)
      if (!hasPoint) {
        ctx.moveTo(x, y)
        hasPoint = true
      } else {
        ctx.lineTo(x, y)
      }
    }
    ctx.stroke()
  })

  let legendX = pad.left
  selectedYKeys.value.forEach((key, seriesIdx) => {
    const label = findSignal(key)?.label ?? key
    ctx.fillStyle = SERIES_COLORS[seriesIdx % SERIES_COLORS.length]!
    ctx.fillRect(legendX, 8, 8, 2)
    ctx.fillStyle = textBase
    ctx.textAlign = 'left'
    ctx.fillText(label, legendX + 12, 12)
    legendX += Math.min(140, ctx.measureText(label).width + 28)
  })
}

function toggleY(key: string) {
  const next = selectedYKeys.value.includes(key)
    ? selectedYKeys.value.filter((k) => k !== key)
    : [...selectedYKeys.value, key]

  if (!next.length) return
  selectedYKeys.value = next
  rebuildPlot()
}

function onDocumentPointerDown(event: PointerEvent) {
  if (!yDropdownOpen.value) return
  const target = event.target
  if (target instanceof Node && yDropdownRef.value?.contains(target)) return
  yDropdownOpen.value = false
}

function onDocumentKeyDown(event: KeyboardEvent) {
  if (event.key === 'Escape') yDropdownOpen.value = false
}

watch(signals, (nextSignals) => {
  syncSelection(nextSignals)
  clearData()
  rebuildPlot()
}, { immediate: true })

watch(simulationRunId, () => {
  resetRunData()
})

watch(hasData, (val) => {
  if (!val) nextTick(renderPlaceholder)
})

watch(
  () => solverStats.value?.stepCount,
  () => {
    const stats = solverStats.value
    if (!stats || stats.stepCount === 0) return

    const allSigs = signals.value
    if (!allSigs.length) return

    if (!historyInitialized) {
      const keys = allSigs.map((s) => s.key)
      initHistory('t', keys)
      historyInitialized = true
    }

    const values = new Float64Array(1 + allSigs.length)
    values[0] = stats.simTime
    for (let i = 0; i < allSigs.length; i++) {
      values[1 + i] = getSignalValue(allSigs[i]!)
    }
    appendHistory(values)

    if (isFollowingLatest.value) {
      const data = dataExtent.value
      if (data && viewDuration.value > 0) {
        viewStart.value = Math.max(data[0], data[1] - viewDuration.value)
      }
    }
    updateChart()
    renderScrubber()
  },
)

onMounted(() => {
  rebuildPlot()
  renderPlaceholder()
  resizeObserver = new ResizeObserver(syncPlotSize)
  if (chartAreaRef.value) resizeObserver.observe(chartAreaRef.value)
  scrubberResizeObserver = new ResizeObserver(renderScrubber)
  if (scrubberRef.value) scrubberResizeObserver.observe(scrubberRef.value)
  document.addEventListener('pointerdown', onDocumentPointerDown)
  document.addEventListener('keydown', onDocumentKeyDown)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocumentPointerDown)
  document.removeEventListener('keydown', onDocumentKeyDown)
  resizeObserver?.disconnect()
  scrubberResizeObserver?.disconnect()
  plot?.destroy()
  plot = null
})
</script>

<template>
  <div class="h-full flex flex-col overflow-hidden bg-bgBase">
    <div class="flex items-center gap-2 px-2 py-1 bg-bgBase border-b border-surfaceHover shrink-0 min-w-0">
      <label class="flex items-center gap-1 min-w-0 shrink-0">
        <span class="text-textMuted text-[11px]">X</span>
        <select
          :value="xMode"
          class="bg-bgBase text-textBase text-[11px] px-1.5 py-0.5 rounded border border-surfaceHover outline-none"
          @change="onXModeSelect"
        >
          <option value="time">时间</option>
          <option value="signal">信号</option>
        </select>
        <select
          v-if="xMode === 'signal'"
          v-model="selectedXKey"
          class="max-w-42 bg-bgBase text-textBase text-[11px] px-1.5 py-0.5 rounded border border-surfaceHover outline-none"
          @change="onXSignalChange"
        >
          <option v-for="s in signals" :key="s.key" :value="s.key">{{ s.label }}</option>
        </select>
      </label>

      <div ref="yDropdownRef" class="relative flex items-center gap-1 min-w-0 flex-1">
        <span class="text-textMuted text-[11px] shrink-0">Y</span>
        <button
          class="min-w-0 max-w-72 flex items-center gap-1 px-1.5 py-0.5 rounded border border-surfaceHover bg-bgBase text-textBase text-[11px] cursor-pointer hover:border-primary/50"
          @click="yDropdownOpen = !yDropdownOpen"
        >
          <span class="truncate">{{ selectedYLabel }}</span>
          <span class="i-carbon-chevron-down w-3 h-3 text-textMuted shrink-0" />
        </button>

        <div
          v-if="yDropdownOpen"
          class="absolute left-4 top-6 z-30 w-64 max-h-72 overflow-auto rounded border border-surfaceHover bg-surface shadow-lg py-1"
        >
          <button
            v-for="s in signals"
            :key="s.key"
            class="w-full flex items-center gap-2 px-2 py-1.5 text-left text-[11px] hover:bg-surfaceHover cursor-pointer"
            :class="selectedYKeys.includes(s.key) ? 'text-primary' : 'text-textBase'"
            @click="toggleY(s.key)"
          >
            <span
              class="w-3 h-3 rounded border flex items-center justify-center shrink-0"
              :class="selectedYKeys.includes(s.key) ? 'border-primary bg-primary text-bgBase' : 'border-surfaceHover'"
            >
              <span v-if="selectedYKeys.includes(s.key)" class="i-carbon-checkmark w-2.5 h-2.5" />
            </span>
            <span class="truncate">{{ s.label }}</span>
          </button>
        </div>
      </div>

    </div>

    <div ref="chartAreaRef" class="flex-1 min-h-0 relative" @wheel.prevent="onChartWheel">
      <canvas v-if="xMode === 'time' && !hasData" ref="placeholderCanvasRef" class="absolute inset-0 h-full w-full" />
      <div v-show="xMode === 'time'" ref="plotHostRef" class="h-full w-full" />
      <canvas v-show="xMode === 'signal'" ref="canvasRef" class="absolute inset-0 h-full w-full" />
      <button
        v-if="hasData"
        class="absolute top-1 right-1 z-10 text-[10px] px-1.5 py-0.5 rounded transition-colors cursor-pointer"
        :class="manualYRange
          ? 'bg-bgBase/80 text-textMuted hover:text-textBase border border-surfaceHover hover:border-primary/50'
          : 'bg-primary/20 text-primary border border-primary/40'"
        @click="resetYFit"
      >
        Y 自动
      </button>
      <div
        v-if="xMode === 'time' && selectedYKeys.length"
        class="absolute top-1 left-12 right-2 flex items-center gap-3 overflow-hidden pointer-events-none"
      >
        <div
          v-for="(key, index) in selectedYKeys"
          :key="key"
          class="min-w-0 flex items-center gap-1.5 text-[11px] text-textBase"
        >
          <span
            class="w-3 h-0.5 shrink-0"
            :style="{ backgroundColor: SERIES_COLORS[index % SERIES_COLORS.length] }"
          />
          <span class="truncate">{{ findSignal(key)?.label ?? key }}</span>
        </div>
      </div>
    </div>

    <div
      v-if="hasScrubber"
      ref="scrubberRef"
      class="h-8 shrink-0 relative border-t border-surfaceHover bg-bgBase"
      @dblclick="onScrubberDblClick"
    >
      <canvas
        ref="scrubberCanvasRef"
        class="absolute inset-0 w-full h-full"
        @pointerdown="onScrubberPointerDown"
        @pointermove="onScrubberPointerMoveCursor"
        @wheel.prevent="onScrubberWheel"
      />
    </div>
  </div>
</template>

<style scoped>
:deep(.u-select) {
  background: rgb(var(--c-primary) / 0.24) !important;
  border: 1px solid rgb(var(--c-primary) / 0.95) !important;
  box-shadow: inset 0 0 0 1px rgb(var(--c-primary) / 0.35);
}

:deep(.u-hz .u-cursor-x),
:deep(.u-vt .u-cursor-y) {
  border-right-color: rgb(var(--c-primary) / 0.9) !important;
}

:deep(.u-hz .u-cursor-y),
:deep(.u-vt .u-cursor-x) {
  border-bottom-color: rgb(var(--c-primary) / 0.9) !important;
}
</style>

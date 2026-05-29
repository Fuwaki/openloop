<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import uPlot from 'uplot'
import 'uplot/dist/uPlot.min.css'
import { useSimulationState } from '@/composables/useSimulationState'
import { useModelLoader } from '@/composables/useModelLoader'

const { currentPlant } = useModelLoader()
const { currentState, currentInput, currentIntermediates, solverStats, simulationRunId } = useSimulationState()

interface SignalDef {
  key: string
  label: string
  source: 'state' | 'input' | 'intermediate'
  index: number
}

type XMode = 'time' | 'signal'
type Range = [number, number]

const MAX_POINTS = 100_000
const SERIES_COLORS = ['#10b981', '#60a5fa', '#f59e0b', '#ef4444', '#a78bfa', '#22d3ee']
const X_WINDOWS = [
  { label: '全量', value: 0 },
  { label: '5s', value: 5 },
  { label: '10s', value: 10 },
  { label: '30s', value: 30 },
  { label: '60s', value: 60 },
]

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
  return list
})

const xMode = ref<XMode>('time')
const selectedXKey = ref('')
const selectedYKeys = ref<string[]>([])
const yDropdownOpen = ref(false)
const autoFit = ref(true)
const xWindowSec = ref(0)
const followLatest = ref(true)
const navEnd = ref(0)
const manualXRange = ref<Range | null>(null)
const manualYRange = ref<Range | null>(null)
const isApplyingScale = ref(false)
const dataVersion = ref(0)

const chartAreaRef = ref<HTMLElement>()
const plotHostRef = ref<HTMLElement>()
const canvasRef = ref<HTMLCanvasElement>()
const yDropdownRef = ref<HTMLElement>()
let plot: uPlot | null = null
let resizeObserver: ResizeObserver | null = null

const xBuf: number[] = []
const yBufs = new Map<string, number[]>()

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

const historyRange = computed<Range>(() => {
  dataVersion.value
  if (!xBuf.length) return [0, 0]
  return [xBuf[0]!, xBuf[xBuf.length - 1]!]
})

const hasNavigator = computed(() => {
  dataVersion.value
  return xMode.value === 'time' && xBuf.length > 1
})

const navigatorMin = computed(() => {
  const [min, max] = historyRange.value
  if (xWindowSec.value <= 0) return min
  return Math.min(max, min + xWindowSec.value)
})

const navigatorMax = computed(() => historyRange.value[1])

const navigatorStep = computed(() => {
  const [min, max] = historyRange.value
  if (max <= min) return 0.001
  return Math.max(0.0001, (max - min) / 1000)
})

const navigatorWindowLabel = computed(() => {
  const range = currentXRange() ?? historyRange.value
  return `${formatTime(range[0])} - ${formatTime(range[1])}`
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
    hooks: {
      setScale: [
        (self, scaleKey) => {
          if (isApplyingScale.value) return
          if (scaleKey === 'x') {
            const min = self.scales.x?.min
            const max = self.scales.x?.max
            if (typeof min === 'number' && typeof max === 'number') {
              manualXRange.value = [min, max]
              autoFit.value = false
            }
          }
          if (scaleKey === 'y') {
            const min = self.scales.y?.min
            const max = self.scales.y?.max
            if (typeof min === 'number' && typeof max === 'number') {
              manualYRange.value = [min, max]
              autoFit.value = false
            }
          }
        },
      ],
    },
  }
}

function currentData(): uPlot.AlignedData {
  return [
    new Float64Array(xBuf),
    ...selectedYKeys.value.map((key) => new Float64Array(yBufs.get(key) ?? [])),
  ]
}

function syncPlotSize() {
  const { width, height } = chartAreaRef.value?.getBoundingClientRect() ?? { width: 0, height: 0 }
  if (plot) {
    plot.setSize({ width: Math.max(1, Math.floor(width)), height: Math.max(1, Math.floor(height)) })
  }
  renderSignalPlot()
}

function rebuildPlot() {
  plot?.destroy()
  plot = null
  if (xMode.value === 'time' && plotHostRef.value) {
    plot = new uPlot(makeOpts(), currentData(), plotHostRef.value)
    syncPlotSize()
    applyViewRange()
    return
  }
  nextTick(renderSignalPlot)
}

function updateChart() {
  if (xMode.value === 'time') {
    isApplyingScale.value = true
    plot?.setData(currentData(), autoFit.value)
    isApplyingScale.value = false
    applyViewRange()
  } else {
    renderSignalPlot()
  }
}

function clearData() {
  xBuf.length = 0
  yBufs.clear()
  manualXRange.value = null
  manualYRange.value = null
  selectedYKeys.value.forEach((key) => yBufs.set(key, []))
  dataVersion.value++
  updateChart()
}

function resetRunData() {
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
  if (!xRange) return xBuf.map((_, i) => i)
  const [min, max] = xRange
  const indices: number[] = []
  xBuf.forEach((value, index) => {
    if (value >= min && value <= max) indices.push(index)
  })
  return indices
}

function rangeForIndices(values: number[], indices: number[]): Range {
  return finiteRange(indices.map((index) => values[index]).filter((value): value is number => value !== undefined))
}

function fullXRange(): Range {
  return finiteRange(xBuf)
}

function fullYRange(indices = visibleIndices(currentXRange())): Range {
  const values = selectedYKeys.value.flatMap((key) => {
    const buf = yBufs.get(key) ?? []
    return indices.map((index) => buf[index]).filter((value): value is number => value !== undefined)
  })
  return finiteRange(values)
}

function currentXRange(): Range | null {
  if (manualXRange.value) return manualXRange.value
  if (xMode.value === 'time' && xWindowSec.value > 0 && xBuf.length) {
    const max = followLatest.value ? xBuf[xBuf.length - 1]! : navEnd.value
    return [max - xWindowSec.value, max]
  }
  if (!autoFit.value && xBuf.length) return fullXRange()
  return null
}

function currentYRange(xRange = currentXRange()): Range | null {
  if (manualYRange.value) return manualYRange.value
  if (xRange && autoFit.value) return fullYRange(visibleIndices(xRange))
  if (!autoFit.value && xBuf.length) return fullYRange(visibleIndices(xRange))
  return null
}

function setAutoFit(value: boolean) {
  autoFit.value = value
  if (value) {
    manualXRange.value = null
    manualYRange.value = null
  }
  updateChart()
}

function fitView() {
  const xRange = currentXRange()
  manualXRange.value = xRange
  manualYRange.value = fullYRange(visibleIndices(xRange))
  autoFit.value = false
  followLatest.value = false
  applyViewRange()
  renderSignalPlot()
}

function resetZoom() {
  manualXRange.value = null
  manualYRange.value = null
  autoFit.value = true
  followLatest.value = true
  syncNavigatorToLatest()
  updateChart()
}

function onXWindowChange(event: Event) {
  xWindowSec.value = Number((event.target as HTMLSelectElement).value)
  manualXRange.value = null
  followLatest.value = true
  syncNavigatorToLatest()
  applyViewRange()
  renderSignalPlot()
}

function syncNavigatorToLatest() {
  navEnd.value = xBuf.length ? xBuf[xBuf.length - 1]! : 0
}

function onNavigatorInput(event: Event) {
  followLatest.value = false
  manualXRange.value = null
  navEnd.value = Number((event.target as HTMLInputElement).value)
  applyViewRange()
  renderSignalPlot()
}

function jumpToLatest() {
  followLatest.value = true
  manualXRange.value = null
  syncNavigatorToLatest()
  applyViewRange()
  renderSignalPlot()
}

function pruneBufferedData() {
  let removeCount = 0

  if (xBuf.length > MAX_POINTS) {
    removeCount = xBuf.length - MAX_POINTS
  }

  if (removeCount <= 0) return
  xBuf.splice(0, removeCount)
  selectedYKeys.value.forEach((key) => yBufs.get(key)?.splice(0, removeCount))
  dataVersion.value++
}

function applyViewRange() {
  if (!plot || xMode.value !== 'time') return
  const xRange = currentXRange()
  const yRange = currentYRange(xRange)

  isApplyingScale.value = true
  plot.batch(() => {
    if (xRange) plot?.setScale('x', { min: xRange[0], max: xRange[1] })
    if (yRange) plot?.setScale('y', { min: yRange[0], max: yRange[1] })
  })
  isApplyingScale.value = false
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
  const [xMin, xMax] = xRange ?? rangeForIndices(xBuf, visible)
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
    const ys = yBufs.get(key) ?? []
    ctx.strokeStyle = SERIES_COLORS[seriesIdx % SERIES_COLORS.length]!
    ctx.lineWidth = 2
    ctx.beginPath()
    let hasPoint = false
    const len = Math.min(xBuf.length, ys.length)
    for (let i = 0; i < len; i++) {
      const xValue = xBuf[i]
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
  clearData()
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

watch(
  () => solverStats.value?.stepCount,
  () => {
    const stats = solverStats.value
    if (!stats) return
    if (stats.stepCount === 0 || selectedYKeys.value.length === 0) return

    const x = getXValue(stats.simTime)
    if (x === null || !Number.isFinite(x)) return

    const values: Array<[string, number]> = []
    for (const key of selectedYKeys.value) {
      const sig = findSignal(key)
      if (!sig) return
      const value = getSignalValue(sig)
      if (!Number.isFinite(value)) return
      values.push([key, value])
    }

    xBuf.push(x)
    for (const [key, value] of values) {
      let buf = yBufs.get(key)
      if (!buf) {
        buf = []
        yBufs.set(key, buf)
      }
      buf.push(value)
    }

    dataVersion.value++
    pruneBufferedData()
    if (followLatest.value) syncNavigatorToLatest()

    updateChart()
  },
)

onMounted(() => {
  rebuildPlot()
  resizeObserver = new ResizeObserver(syncPlotSize)
  if (chartAreaRef.value) resizeObserver.observe(chartAreaRef.value)
  document.addEventListener('pointerdown', onDocumentPointerDown)
  document.addEventListener('keydown', onDocumentKeyDown)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocumentPointerDown)
  document.removeEventListener('keydown', onDocumentKeyDown)
  resizeObserver?.disconnect()
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

      <label v-if="xMode === 'time'" class="flex items-center gap-1 shrink-0">
        <span class="text-textMuted text-[11px]">窗口</span>
        <select
          :value="xWindowSec"
          class="bg-bgBase text-textBase text-[11px] px-1.5 py-0.5 rounded border border-surfaceHover outline-none"
          @change="onXWindowChange"
        >
          <option v-for="item in X_WINDOWS" :key="item.value" :value="item.value">
            {{ item.label }}
          </option>
        </select>
      </label>

      <label class="flex items-center gap-1 text-[11px] text-textMuted shrink-0 cursor-pointer select-none">
        <input
          type="checkbox"
          :checked="autoFit"
          class="chart-checkbox"
          @change="setAutoFit(($event.target as HTMLInputElement).checked)"
        />
        自动
      </label>

      <button
        class="text-textMuted hover:text-textBase text-[11px] px-1.5 py-0.5 rounded hover:bg-surfaceHover transition-colors cursor-pointer shrink-0"
        @click="fitView"
      >
        适合
      </button>

      <button
        class="text-textMuted hover:text-textBase text-[11px] px-1.5 py-0.5 rounded hover:bg-surfaceHover transition-colors cursor-pointer shrink-0"
        @click="resetZoom"
      >
        重置
      </button>

      <button
        class="text-textMuted hover:text-textBase text-[11px] px-1.5 py-0.5 rounded hover:bg-surfaceHover transition-colors cursor-pointer shrink-0"
        @click="clearData"
      >
        清除
      </button>
    </div>

    <div ref="chartAreaRef" class="flex-1 min-h-0 relative">
      <div v-show="xMode === 'time'" ref="plotHostRef" class="h-full w-full" />
      <canvas v-show="xMode === 'signal'" ref="canvasRef" class="absolute inset-0 h-full w-full" />
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
      v-if="hasNavigator"
      class="h-8 shrink-0 flex items-center gap-2 px-2 border-t border-surfaceHover bg-bgBase"
    >
      <span class="text-textMuted text-[11px] font-mono shrink-0">{{ formatTime(historyRange[0]) }}</span>
      <input
        type="range"
        :min="navigatorMin"
        :max="navigatorMax"
        :step="navigatorStep"
        :value="followLatest ? navigatorMax : navEnd"
        class="chart-navigator flex-1"
        @input="onNavigatorInput"
      />
      <span class="text-textMuted text-[11px] font-mono shrink-0">{{ formatTime(historyRange[1]) }}</span>
      <span class="w-32 text-textBase text-[11px] font-mono text-center shrink-0">{{ navigatorWindowLabel }}</span>
      <button
        class="text-[11px] px-1.5 py-0.5 rounded transition-colors cursor-pointer shrink-0"
        :class="followLatest ? 'text-primary bg-primaryDim' : 'text-textMuted hover:text-textBase hover:bg-surfaceHover'"
        @click="jumpToLatest"
      >
        最新
      </button>
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

.chart-checkbox {
  width: 12px;
  height: 12px;
  accent-color: rgb(var(--c-primary));
}

.chart-navigator {
  height: 14px;
  accent-color: rgb(var(--c-primary));
}
</style>

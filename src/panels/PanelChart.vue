<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import uPlot from 'uplot'
import 'uplot/dist/uPlot.min.css'

const chartRef = ref<HTMLElement>()
let plot: uPlot | null = null
let resizeObserver: ResizeObserver | null = null

// 对齐 base.css 设计 token
const axisColor = '#888888'    // --c-text-muted
const gridColor = '#2a2a2a'    // --c-bg-surface-hover
const seriesColor = '#10b981'  // --c-primary

const opts: uPlot.Options = {
  width: 400,
  height: 200,
  axes: [
    { stroke: axisColor, grid: { stroke: gridColor } },
    { stroke: axisColor, grid: { stroke: gridColor } },
  ],
  series: [
    {},
    { stroke: seriesColor, width: 2 },
  ],
  cursor: {
    drag: { x: true, y: true },
  },
}

const data: uPlot.AlignedData = [[], []]

onMounted(() => {
  if (!chartRef.value) return

  plot = new uPlot(opts, data, chartRef.value)

  resizeObserver = new ResizeObserver(() => {
    if (chartRef.value && plot) {
      const { width, height } = chartRef.value.getBoundingClientRect()
      plot.setSize({ width: Math.floor(width), height: Math.floor(height) })
    }
  })
  resizeObserver.observe(chartRef.value)
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  plot?.destroy()
  plot = null
})

function setData(time: number[], values: number[]) {
  if (!plot) return
  plot.setData([time, values])
}

defineExpose({ setData })
</script>

<template>
  <div ref="chartRef" class="h-full w-full" />
</template>

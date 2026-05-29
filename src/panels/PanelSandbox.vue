<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { SandboxRenderer } from '@/sandbox/SandboxRenderer'
import { createMassSpringScene } from '@/sandbox/scenes/massSpring'
import type { SandboxFrame, SandboxToggles } from '@/sandbox/types'

const hostRef = ref<HTMLElement>()
const renderer = new SandboxRenderer()
const toggles = reactive<SandboxToggles>({
  showGrid: true,
  showLegend: true,
  showVectors: true,
  showLabels: true,
})

let rafId = 0
const frame: SandboxFrame = { time: 0, state: { x: 0.35, v: 0, force: -0.35 } }

function updateFrame(now: number) {
  frame.time = now / 1000
  const x = 0.35 + Math.sin(frame.time * 1.6) * 0.34
  const v = Math.cos(frame.time * 1.6) * 0.34
  frame.state = {
    x,
    v,
    force: -x * 0.8,
  }
  renderer.setScene(createMassSpringScene(frame))
  renderer.setFrame(frame)
  rafId = requestAnimationFrame(updateFrame)
}

watch(toggles, (value) => renderer.setToggles(value), { deep: true })

onMounted(async () => {
  if (!hostRef.value) return
  await renderer.mount(hostRef.value)
  renderer.setToggles(toggles)
  renderer.setScene(createMassSpringScene(frame))
  rafId = requestAnimationFrame(updateFrame)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(rafId)
  renderer.destroy()
})
</script>

<template>
  <div class="h-full min-h-0 flex flex-col bg-surface">
    <div class="h-9 shrink-0 flex items-center justify-between gap-2 border-b border-surfaceHover px-3">
      <div class="flex items-center gap-2 text-xs text-textMuted">
        <span class="i-carbon-cube text-primary text-base" />
        <span class="font-mono">mass-spring.demo</span>
      </div>
      <div class="flex items-center gap-2">
        <label class="sandbox-toggle">
          <input v-model="toggles.showGrid" type="checkbox" />
          <span class="i-carbon-grid" />
        </label>
        <label class="sandbox-toggle">
          <input v-model="toggles.showVectors" type="checkbox" />
          <span class="i-carbon-direction-straight-right" />
        </label>
        <label class="sandbox-toggle">
          <input v-model="toggles.showLabels" type="checkbox" />
          <span class="i-carbon-text-font" />
        </label>
        <label class="sandbox-toggle">
          <input v-model="toggles.showLegend" type="checkbox" />
          <span class="i-carbon-list-boxes" />
        </label>
      </div>
    </div>
    <div ref="hostRef" class="sandbox-host flex-1 min-h-0" />
  </div>
</template>

<style scoped>
.sandbox-host {
  position: relative;
  overflow: hidden;
  background: var(--c-bg-base);
}

.sandbox-toggle {
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--c-bg-surface-hover);
  border-radius: 6px;
  color: var(--c-text-muted);
  cursor: pointer;
}

.sandbox-toggle:hover {
  color: var(--c-text-base);
  border-color: rgb(var(--c-primary));
}

.sandbox-toggle input {
  display: none;
}

.sandbox-toggle:has(input:checked) {
  color: rgb(var(--c-primary));
  background: rgba(var(--c-primary-dim), 0.16);
}

:deep(.sandbox-canvas) {
  display: block;
  width: 100%;
  height: 100%;
}
</style>

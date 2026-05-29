<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { SandboxRenderer } from '@/sandbox/SandboxRenderer'
import type { SandboxFrame, SandboxToggles } from '@/sandbox/types'
import { useSimulationState } from '@/composables/useSimulationState'
import { useModelLoader } from '@/composables/useModelLoader'

const hostRef = ref<HTMLElement>()
const renderer = new SandboxRenderer()
const toggles = reactive<SandboxToggles>({
  showGrid: true,
  showLegend: true,
  showVectors: true,
  showLabels: true,
})

const { currentEntry, currentPlant, currentParams } = useModelLoader()
const { currentState, currentInput, currentIntermediates, solverStats } = useSimulationState()

const hasScene = computed(() => !!currentEntry.value?.createScene)
const isRunning = computed(() => !!solverStats.value)

let lastSceneId = ''

const sceneParams = computed<Record<string, number>>(() => {
  const values: Record<string, number> = {}
  for (const param of currentParams.value) values[param.name] = param.value
  return values
})

function buildFrame(): SandboxFrame | null {
  const plant = currentPlant.value
  if (!plant || !currentState.value) return null

  const state: Record<string, number> = {}
  plant.stateVars.forEach((v, i) => { state[v.name] = currentState.value![i] ?? 0 })
  plant.inputVars.forEach((v, i) => { state[v.name] = currentInput.value?.[i] ?? 0 })
  plant.intermediateVars.forEach((v, i) => { state[v.name] = currentIntermediates.value?.[i] ?? 0 })

  return { time: solverStats.value?.simTime ?? 0, state }
}

function syncScene() {
  const entry = currentEntry.value
  const plant = currentPlant.value
  if (!entry?.createScene || !plant) return

  const frame = buildFrame()
  if (!frame) return

  lastSceneId = entry.id
  renderer.setSceneFrame(entry.createScene(frame, sceneParams.value), frame)
}

watch(
  () => [
    solverStats.value?.stepCount,
    currentEntry.value?.id,
    currentParams.value.map((param) => param.value).join('|'),
  ],
  () => {
    if (!solverStats.value || solverStats.value.stepCount === 0) return
    syncScene()
  },
)

// 模型切换时清空场景
watch(currentEntry, (entry) => {
  lastSceneId = ''
  if (!entry?.createScene) {
    renderer.setScene({ id: 'empty', title: '', camera: { center: { x: 0, y: 0 }, scale: 100 }, objects: [], annotations: [], legend: [] })
  }
})

watch(toggles, (value) => renderer.setToggles(value), { deep: true })

onMounted(async () => {
  if (!hostRef.value) return
  await renderer.mount(hostRef.value)
  renderer.setToggles(toggles)
})

onBeforeUnmount(() => {
  renderer.destroy()
})
</script>

<template>
  <div class="h-full min-h-0 flex flex-col bg-surface">
    <div class="h-9 shrink-0 flex items-center justify-between gap-2 border-b border-surfaceHover px-3">
      <div class="flex items-center gap-2 text-xs text-textMuted">
        <span class="i-carbon-cube text-primary text-base" />
        <span class="font-mono">{{ currentEntry?.name ?? '沙盒' }}</span>
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
    <div class="flex-1 min-h-0 relative">
      <div ref="hostRef" class="sandbox-host absolute inset-0" />
      <!-- 占位提示 -->
      <div
        v-if="!hasScene || !isRunning"
        class="absolute inset-0 flex items-center justify-center pointer-events-none"
      >
        <div class="text-center text-textMuted">
          <span class="i-carbon-cube text-3xl block mb-2 opacity-40" />
          <p class="text-xs">{{ hasScene ? '请运行仿真以查看沙盒' : '当前模型不支持沙盒可视化' }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sandbox-host {
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
  width: 100% !important;
  height: 100% !important;
}
</style>

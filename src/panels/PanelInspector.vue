<script setup lang="ts">
import { computed } from 'vue'
import { useSimulationState } from '@/composables/useSimulationState'
import { useModelLoader } from '@/composables/useModelLoader'

const { currentPlant } = useModelLoader()
const { currentState, currentInput, currentIntermediates, solverStats, controllerStats } = useSimulationState()

function fmt(v: number, decimals = 2): string {
  if (!Number.isFinite(v)) return '—'
  return v.toFixed(decimals)
}

// ── 被控对象 ──

const plantName = computed(() => currentPlant.value?.name ?? '—')
const plantDesc = computed(() => currentPlant.value?.description ?? '')
const plantCategory = computed(() => currentPlant.value?.category ?? '')

const plantParams = computed(() => {
  const p = currentPlant.value?.params
  if (!p) return []
  return Object.entries(p).map(([name, value]) => ({ name, value }))
})

// ── 变量表 ──

interface VarRow {
  name: string
  unit: string
  label: string
  value: string
}

function buildVarRows(
  vars: { name: string; unit: string; label: string }[] | undefined,
  values: Float64Array | null,
): VarRow[] {
  if (!vars || !values) return []
  return vars.map((v, i) => ({
    name: v.name,
    unit: v.unit,
    label: v.label,
    value: fmt(values[i]!, 4),
  }))
}

const stateRows = computed(() =>
  buildVarRows(currentPlant.value?.stateVars, currentState.value),
)
const inputRows = computed(() =>
  buildVarRows(currentPlant.value?.inputVars, currentInput.value),
)
const intermediateRows = computed(() =>
  buildVarRows(currentPlant.value?.intermediateVars, currentIntermediates.value),
)

// ── 求解器统计 ──

const stats = computed(() => solverStats.value)
</script>

<template>
  <div class="flex flex-col h-full overflow-hidden">
    <div class="flex-1 overflow-y-auto p-2 space-y-3 text-xs">

      <!-- 被控对象 -->
      <section>
        <h3 class="text-[10px] text-textMuted uppercase tracking-wider px-1 mb-1">被控对象</h3>
        <div class="rounded-lg bg-bgSurface px-3 py-2 space-y-1.5">
          <div class="flex items-center justify-between">
            <span class="text-textMuted">模型</span>
            <span class="text-textBase font-mono">{{ plantName }}</span>
          </div>
          <div v-if="plantDesc" class="text-textMuted text-[11px] leading-snug">{{ plantDesc }}</div>
          <div v-if="plantCategory" class="flex items-center justify-between">
            <span class="text-textMuted">类型</span>
            <span class="text-textBase font-mono">{{ plantCategory === 'nonlinear' ? '非线性' : '线性' }}</span>
          </div>
        </div>
      </section>

      <!-- 参数 -->
      <section v-if="plantParams.length">
        <h3 class="text-[10px] text-textMuted uppercase tracking-wider px-1 mb-1">参数</h3>
        <div class="rounded-lg bg-bgSurface divide-y divide-bgSurfaceHover">
          <div
            v-for="p in plantParams"
            :key="p.name"
            class="flex items-center justify-between px-3 py-1.5"
          >
            <span class="text-textMuted font-mono">{{ p.name }}</span>
            <span class="text-textBase font-mono">{{ fmt(p.value, 3) }}</span>
          </div>
        </div>
      </section>

      <!-- 状态变量 -->
      <section v-if="stateRows.length">
        <h3 class="text-[10px] text-textMuted uppercase tracking-wider px-1 mb-1">状态变量</h3>
        <div class="rounded-lg bg-bgSurface divide-y divide-bgSurfaceHover">
          <div
            v-for="row in stateRows"
            :key="row.name"
            class="flex items-center justify-between px-3 py-1.5"
          >
            <span class="text-textMuted">
              <span class="font-mono">{{ row.name }}</span>
              <span class="ml-1 text-[10px]">({{ row.label }})</span>
            </span>
            <span class="text-textBase font-mono">
              {{ row.value }}
              <span v-if="row.unit" class="text-textMuted text-[10px] ml-0.5">{{ row.unit }}</span>
            </span>
          </div>
        </div>
      </section>

      <!-- 输入 -->
      <section v-if="inputRows.length">
        <h3 class="text-[10px] text-textMuted uppercase tracking-wider px-1 mb-1">输入</h3>
        <div class="rounded-lg bg-bgSurface divide-y divide-bgSurfaceHover">
          <div
            v-for="row in inputRows"
            :key="row.name"
            class="flex items-center justify-between px-3 py-1.5"
          >
            <span class="text-textMuted">
              <span class="font-mono">{{ row.name }}</span>
              <span class="ml-1 text-[10px]">({{ row.label }})</span>
            </span>
            <span class="text-textBase font-mono">
              {{ row.value }}
              <span v-if="row.unit" class="text-textMuted text-[10px] ml-0.5">{{ row.unit }}</span>
            </span>
          </div>
        </div>
      </section>

      <!-- 中间变量 -->
      <section v-if="intermediateRows.length">
        <h3 class="text-[10px] text-textMuted uppercase tracking-wider px-1 mb-1">中间变量</h3>
        <div class="rounded-lg bg-bgSurface divide-y divide-bgSurfaceHover">
          <div
            v-for="row in intermediateRows"
            :key="row.name"
            class="flex items-center justify-between px-3 py-1.5"
          >
            <span class="text-textMuted">
              <span class="font-mono">{{ row.name }}</span>
              <span class="ml-1 text-[10px]">({{ row.label }})</span>
            </span>
            <span class="text-textBase font-mono">
              {{ row.value }}
              <span v-if="row.unit" class="text-textMuted text-[10px] ml-0.5">{{ row.unit }}</span>
            </span>
          </div>
        </div>
      </section>

      <!-- 求解器统计 -->
      <section>
        <h3 class="text-[10px] text-textMuted uppercase tracking-wider px-1 mb-1">求解器</h3>
        <div class="rounded-lg bg-bgSurface divide-y divide-bgSurfaceHover">
          <template v-if="stats">
            <div class="flex items-center justify-between px-3 py-1.5">
              <span class="text-textMuted">算法</span>
              <span class="text-textBase font-mono">{{ stats.solverId }}</span>
            </div>
            <div class="flex items-center justify-between px-3 py-1.5">
              <span class="text-textMuted">仿真时间</span>
              <span class="text-textBase font-mono">{{ fmt(stats.simTime, 4) }} <span class="text-textMuted text-[10px]">s</span></span>
            </div>
            <div class="flex items-center justify-between px-3 py-1.5">
              <span class="text-textMuted">步数</span>
              <span class="text-textBase font-mono">{{ stats.stepCount }}</span>
            </div>
            <div class="flex items-center justify-between px-3 py-1.5">
              <span class="text-textMuted">上一步</span>
              <span class="text-textBase font-mono">{{ fmt(stats.wallTimeLastStep, 3) }} <span class="text-textMuted text-[10px]">ms</span></span>
            </div>
            <div class="flex items-center justify-between px-3 py-1.5">
              <span class="text-textMuted">平均</span>
              <span class="text-textBase font-mono">{{ fmt(stats.wallTimeAvg, 3) }} <span class="text-textMuted text-[10px]">ms</span></span>
            </div>
            <div class="flex items-center justify-between px-3 py-1.5">
              <span class="text-textMuted">吞吐量</span>
              <span class="text-textBase font-mono">{{ fmt(stats.stepsPerSecond, 0) }} <span class="text-textMuted text-[10px]">steps/s</span></span>
            </div>
            <div class="flex items-center justify-between px-3 py-1.5">
              <span class="text-textMuted">总时间</span>
              <span class="text-textBase font-mono">{{ fmt(stats.wallTimeTotal, 1) }} <span class="text-textMuted text-[10px]">ms</span></span>
            </div>
          </template>
          <div v-else class="px-3 py-2 text-textMuted text-center text-[11px]">
            未运行
          </div>
        </div>
      </section>

      <!-- Controller 性能 -->
      <section>
        <h3 class="text-[10px] text-textMuted uppercase tracking-wider px-1 mb-1">Python 解释器</h3>
        <div class="rounded-lg bg-bgSurface divide-y divide-bgSurfaceHover">
          <template v-if="controllerStats">
            <div class="flex items-center justify-between px-3 py-1.5">
              <span class="text-textMuted">上次调用</span>
              <span class="text-textBase font-mono">{{ fmt(controllerStats.lastCallTime, 3) }} <span class="text-textMuted text-[10px]">ms</span></span>
            </div>
            <div class="flex items-center justify-between px-3 py-1.5">
              <span class="text-textMuted">平均</span>
              <span class="text-textBase font-mono">{{ fmt(controllerStats.avgCallTime, 3) }} <span class="text-textMuted text-[10px]">ms</span></span>
            </div>
          </template>
          <div v-else class="px-3 py-2 text-textMuted text-center text-[11px]">
            未运行
          </div>
        </div>
      </section>

    </div>
  </div>
</template>

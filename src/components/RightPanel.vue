<script setup lang="ts">
import { computed } from 'vue'
import { useSimulationState } from '@/composables/useSimulationState'
import { useModelLoader } from '@/composables/useModelLoader'

const { currentPlant } = useModelLoader()
const { currentState, solverStats, controllerStats } = useSimulationState()

interface InspectorItem {
  label: string
  value: string
  live?: boolean
}

const sections = computed(() => [
  {
    id: 'model',
    title: '被控系统',
    icon: 'i-carbon-cube',
    items: (currentPlant.value
      ? [{ label: currentPlant.value.name, value: currentPlant.value.description }]
      : [{ label: '未选择模型', value: '请在侧栏中选择被控模型' }]) as InspectorItem[],
  },
  {
    id: 'params',
    title: '模型参数',
    icon: 'i-carbon-settings-adjust',
    items: (currentPlant.value
      ? Object.entries(currentPlant.value.params).map(([name, value]) => ({
          label: name,
          value: Number(value).toFixed(3),
        }))
      : []) as InspectorItem[],
  },
  {
    id: 'states',
    title: '状态变量',
    icon: 'i-carbon-chart-line-data',
    items: (currentPlant.value && currentState.value
      ? currentPlant.value.stateVars.map((v, i) => ({
          label: v.name,
          value: `${currentState.value![i]!.toFixed(4)}${v.unit ? ' ' + v.unit : ''}`,
          live: true,
        }))
      : []) as InspectorItem[],
  },
  {
    id: 'sim',
    title: '求解器',
    icon: 'i-carbon-timer',
    items: (solverStats.value
      ? [
          { label: '算法', value: solverStats.value.solverId },
          { label: '仿真时间', value: `${solverStats.value.simTime.toFixed(4)} s` },
          { label: '步数', value: String(solverStats.value.stepCount) },
          { label: '上一步', value: `${solverStats.value.wallTimeLastStep.toFixed(3)} ms` },
          { label: '平均', value: `${solverStats.value.wallTimeAvg.toFixed(3)} ms` },
          { label: '吞吐量', value: `${solverStats.value.stepsPerSecond.toFixed(0)} steps/s` },
          { label: '总时间', value: `${solverStats.value.wallTimeTotal.toFixed(1)} ms` },
        ]
      : [{ label: '状态', value: '未运行' }]) as InspectorItem[],
  },
  {
    id: 'controller',
    title: 'Python 解释器',
    icon: 'i-carbon-script',
    items: (controllerStats.value
      ? [
          { label: '上次调用', value: `${controllerStats.value.lastCallTime.toFixed(3)} ms` },
          { label: '平均', value: `${controllerStats.value.avgCallTime.toFixed(3)} ms` },
        ]
      : [{ label: '状态', value: '未运行' }]) as InspectorItem[],
  },
])
</script>

<template>
  <div class="w-72 h-full bg-surface border-l border-surfaceHover flex flex-col shrink-0 overflow-hidden">
    <!-- 标题 -->
    <div class="h-10 flex items-center px-4 border-b border-surfaceHover shrink-0">
      <span class="text-textMuted text-xs font-medium tracking-wide uppercase">检查器</span>
    </div>

    <!-- 内容 -->
    <div class="flex-1 overflow-y-auto">
      <div v-for="section in sections" :key="section.id" class="border-b border-surfaceHover">
        <!-- 区块标题 -->
        <div class="flex items-center gap-2 px-4 py-2.5 bg-bgBase">
          <span :class="section.icon" class="text-primary w-3.5 h-3.5" />
          <span class="text-textBase text-xs font-medium">{{ section.title }}</span>
        </div>

        <!-- 区块内容 -->
        <div class="px-4 py-2 space-y-1.5">
          <div
            v-for="(item, i) in section.items"
            :key="i"
            class="flex items-center justify-between gap-2"
          >
            <span class="text-textMuted text-xs shrink-0">{{ item.label }}</span>
            <div class="flex items-center gap-1.5 min-w-0">
              <span
                v-if="item.live && solverStats?.stepCount"
                class="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shrink-0"
              />
              <span class="text-textBase text-xs font-mono truncate text-right">{{ item.value }}</span>
            </div>
          </div>

          <div v-if="section.items.length === 0" class="text-textMuted text-xs py-1">
            暂无数据
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

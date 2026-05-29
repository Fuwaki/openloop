<script setup lang="ts">
import { computed } from 'vue'
import { useSimulation } from '@/composables/useSimulation'

const props = defineProps<{
  modelName?: string
  modelDescription?: string
  modelParams?: Array<{ name: string; value: number }>
  modelStates?: Array<{ name: string; value: number; unit?: string }>
}>()

const { isRunning } = useSimulation()

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
    items: (props.modelName
      ? [{ label: props.modelName, value: props.modelDescription ?? '' }]
      : [{ label: '未选择模型', value: '请在侧栏中选择被控模型' }]) as InspectorItem[],
  },
  {
    id: 'params',
    title: '模型参数',
    icon: 'i-carbon-settings-adjust',
    items: (props.modelParams ?? []).map((p) => ({
      label: p.name,
      value: String(p.value),
    })) as InspectorItem[],
  },
  {
    id: 'states',
    title: '状态变量',
    icon: 'i-carbon-chart-line-data',
    items: (props.modelStates ?? []).map((s) => ({
      label: s.name,
      value: `${s.value.toFixed(4)}${s.unit ? ' ' + s.unit : ''}`,
      live: true,
    })) as InspectorItem[],
  },
  {
    id: 'sim',
    title: '仿真配置',
    icon: 'i-carbon-timer',
    items: [
      { label: '状态', value: isRunning.value ? '运行中' : '就绪' },
      { label: '步长', value: '0.01 s' },
      { label: '求解器', value: 'RK4' },
    ] as InspectorItem[],
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
                v-if="item.live && isRunning"
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

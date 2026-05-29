<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSimulation } from '@/composables/useSimulation'
import { getModelsByCategory, type PlantModel } from '@/models/registry'

const props = defineProps<{
  modelValue?: PlantModel | null
}>()

const emit = defineEmits<{
  openSettings: []
  'update:modelValue': [model: PlantModel | null]
}>()

const { isRunning, stopSimulation, outputHistory, clearOutput } = useSimulation()

const expanded = ref(false)
const activeCategory = ref<PlantModel['category']>('linear')
const currentModel = ref<PlantModel | null>(props.modelValue ?? null)

const categories = [
  { id: 'linear' as const, label: '线性系统' },
  { id: 'nonlinear' as const, label: '非线性系统' },
  { id: 'custom' as const, label: '自定义' },
]

const models = computed(() => getModelsByCategory(activeCategory.value))

function selectModel(m: PlantModel) {
  currentModel.value = m
  emit('update:modelValue', m)
  expanded.value = false
}

function toggleSim() {
  if (isRunning.value) stopSimulation()
}

function exportOutput() {
  const lines = outputHistory.value.map((e) => {
    const tag = e.type === 'stdout' ? '' : `[${e.type}] `
    return `${tag}${e.text}`
  })
  const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `openloop-export-${Date.now()}.txt`
  a.click()
  URL.revokeObjectURL(a.href)
}
</script>

<template>
  <div
    class="h-full bg-surface border-r border-surfaceHover shrink-0 flex transition-all duration-200 overflow-hidden"
    :class="expanded ? 'w-96' : 'w-16'"
  >
    <!-- 图标栏 -->
    <div class="w-16 h-full flex flex-col items-center shrink-0">
      <div class="w-full h-14 flex items-center justify-center relative group">
        <span class="text-primary text-lg font-bold select-none">OL</span>
        <span
          v-if="!expanded"
          class="absolute left-full ml-2 px-2 py-1 bg-bgBase text-textBase text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 border border-surfaceHover"
        >OpenLoop</span>
      </div>

      <div class="w-8 border-t border-surfaceHover my-1" />

      <!-- 模型 -->
      <button
        class="w-full h-12 flex items-center justify-center transition-colors relative group cursor-pointer"
        :class="expanded ? 'text-primary bg-primary/10' : 'text-textMuted hover:text-textBase hover:bg-surfaceHover'"
        @click="expanded = !expanded"
      >
        <span class="i-carbon-model-alt w-5 h-5" />
        <span
          v-if="!expanded"
          class="absolute left-full ml-2 px-2 py-1 bg-bgBase text-textBase text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 border border-surfaceHover"
        >模型{{ currentModel ? `: ${currentModel.name}` : '' }}</span>
      </button>

      <div class="w-8 border-t border-surfaceHover my-1" />

      <!-- 运行/停止 -->
      <button
        class="w-full h-12 flex items-center justify-center transition-colors relative group cursor-pointer"
        :class="isRunning ? 'text-error hover:bg-error/10' : 'text-primary hover:bg-primary/10'"
        @click="toggleSim"
      >
        <span :class="isRunning ? 'i-carbon-stop-filled' : 'i-carbon-play-filled'" class="w-5 h-5" />
        <span
          v-if="!expanded"
          class="absolute left-full ml-2 px-2 py-1 bg-bgBase text-textBase text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 border border-surfaceHover"
        >{{ isRunning ? '停止' : '运行' }}</span>
      </button>

      <!-- 导出 -->
      <button
        class="w-full h-12 flex items-center justify-center text-textMuted hover:text-textBase hover:bg-surfaceHover transition-colors relative group cursor-pointer"
        @click="exportOutput"
      >
        <span class="i-carbon-export w-5 h-5" />
        <span
          v-if="!expanded"
          class="absolute left-full ml-2 px-2 py-1 bg-bgBase text-textBase text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 border border-surfaceHover"
        >导出</span>
      </button>

      <!-- 清空 -->
      <button
        class="w-full h-12 flex items-center justify-center text-textMuted hover:text-textBase hover:bg-surfaceHover transition-colors relative group cursor-pointer"
        @click="clearOutput"
      >
        <span class="i-carbon-trash-can w-5 h-5" />
        <span
          v-if="!expanded"
          class="absolute left-full ml-2 px-2 py-1 bg-bgBase text-textBase text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 border border-surfaceHover"
        >清空</span>
      </button>

      <div class="flex-1" />

      <!-- 设置 -->
      <button
        class="w-full h-12 flex items-center justify-center text-textMuted hover:text-textBase hover:bg-surfaceHover transition-colors relative group cursor-pointer"
        @click="emit('openSettings')"
      >
        <span class="i-carbon-settings w-5 h-5" />
        <span
          v-if="!expanded"
          class="absolute left-full ml-2 px-2 py-1 bg-bgBase text-textBase text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 border border-surfaceHover"
        >设置</span>
      </button>
    </div>

    <!-- 展开区：模型列表 -->
    <Transition name="panel">
      <div v-if="expanded" class="flex-1 flex flex-col min-w-0 border-l border-surfaceHover">
        <div class="h-14 flex items-center justify-between px-5 border-b border-surfaceHover shrink-0">
          <span class="text-textBase text-sm font-bold">被控模型</span>
          <button class="text-textMuted hover:text-textBase cursor-pointer" @click="expanded = false">
            <span class="i-carbon-close w-4 h-4" />
          </button>
        </div>
        <div class="flex border-b border-surfaceHover shrink-0">
          <button
            v-for="cat in categories"
            :key="cat.id"
            class="flex-1 py-2.5 text-sm transition-colors cursor-pointer"
            :class="activeCategory === cat.id ? 'text-primary border-b-2 border-primary' : 'text-textMuted hover:text-textBase'"
            @click="activeCategory = cat.id"
          >{{ cat.label }}</button>
        </div>
        <div class="flex-1 overflow-y-auto p-3 space-y-2">
          <button
            v-for="m in models"
            :key="m.id"
            class="w-full text-left p-4 rounded-lg transition-colors cursor-pointer"
            :class="currentModel?.id === m.id ? 'bg-primary/10 border border-primary/30' : 'bg-bgBase border border-surfaceHover hover:border-primary/50'"
            @click="selectModel(m)"
          >
            <div class="flex items-start gap-3">
              <span :class="m.icon" class="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div class="min-w-0">
                <h3 class="text-textBase text-sm font-medium">{{ m.name }}</h3>
                <p class="text-textMuted text-xs mt-1 leading-relaxed">{{ m.description }}</p>
                <div class="flex flex-wrap gap-1.5 mt-2">
                  <span
                    v-for="p in m.params"
                    :key="p.name"
                    class="text-primary/70 text-[11px] bg-primary/10 px-2 py-0.5 rounded font-mono"
                  >{{ p.name }}={{ p.value }}</span>
                </div>
              </div>
            </div>
          </button>
          <div v-if="models.length === 0" class="text-center py-12 text-textMuted text-sm">暂无模型</div>
        </div>
        <div v-if="currentModel" class="px-5 py-3 border-t border-surfaceHover shrink-0">
          <p class="text-textMuted text-xs">当前模型</p>
          <p class="text-primary text-sm font-medium truncate mt-0.5">{{ currentModel.name }}</p>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.panel-enter-active,
.panel-leave-active {
  transition: opacity 0.15s;
}
.panel-enter-from,
.panel-leave-to {
  opacity: 0;
}
</style>

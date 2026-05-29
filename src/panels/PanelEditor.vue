<script setup lang="ts">
import { ref } from 'vue'
import CodeEditor from '@/components/CodeEditor.vue'
import { useSimulation } from '@/composables/useSimulation'

const props = withDefaults(defineProps<{
  language?: string
  modelValue?: string
}>(), {
  language: 'python',
  modelValue: `import numpy as np

# 生成数据
x = np.linspace(0, 2 * np.pi, 100)
y = np.sin(x)

print(f"Generated {len(x)} data points")
print(f"y range: [{y.min():.2f}, {y.max():.2f}]")
`,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const code = ref(props.modelValue)
const { runCode, isRunning, isPyodideReady, isPyodideLoading } = useSimulation()

function onUpdate(val: string) {
  code.value = val
  emit('update:modelValue', val)
}

function onRun() {
  runCode(code.value)
}
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- 工具栏 -->
    <div class="flex items-center gap-2 px-2 py-1 bg-bgBase border-b border-surfaceHover">
      <button
        class="flex items-center gap-1.5 px-3 py-1 text-xs rounded cursor-pointer transition-colors"
        :class="isRunning ? 'bg-surfaceHover text-textMuted' : 'bg-primary text-bgBase hover:opacity-80'"
        :disabled="isRunning"
        @click="onRun"
      >
        <span v-if="isRunning" class="i-carbon-circle-dash w-3.5 h-3.5 animate-spin" />
        <span v-else class="i-carbon-play-filled w-3.5 h-3.5" />
        {{ isRunning ? '运行中...' : '运行' }}
      </button>
      <span v-if="isPyodideLoading" class="text-textMuted text-xs">Pyodide 加载中...</span>
      <span v-else-if="isPyodideReady" class="text-textMuted text-xs">Pyodide 就绪</span>
    </div>
    <!-- 编辑器 -->
    <div class="flex-1 min-h-0">
      <CodeEditor
        :model-value="code"
        :language="language"
        @update:model-value="onUpdate"
      />
    </div>
  </div>
</template>

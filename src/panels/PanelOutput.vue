<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { useSimulationState, useSimulationRunner } from '@/modules/simulation'

const { outputHistory, clearOutput } = useSimulationState()
const runner = useSimulationRunner()
const isSimRunning = runner.isRunning

const outputRef = ref<HTMLElement>()

watch(outputHistory, async () => {
  await nextTick()
  if (outputRef.value) {
    outputRef.value.scrollTop = outputRef.value.scrollHeight
  }
}, { deep: true })
</script>

<template>
  <div class="h-full flex flex-col bg-bgBase">
    <!-- 工具栏 -->
    <div class="flex items-center justify-between px-2 py-1 border-b border-surfaceHover">
      <span class="text-textMuted text-xs">输出</span>
      <button
        class="text-textMuted hover:text-textBase text-xs cursor-pointer"
        @click="clearOutput"
      >
        清空
      </button>
    </div>
    <!-- 输出内容 -->
    <div ref="outputRef" class="flex-1 overflow-auto p-3 font-mono text-sm">
      <div v-if="outputHistory.length === 0 && !isSimRunning" class="text-textMuted text-xs">
        点击「运行」执行代码
      </div>
      <div v-for="(line, i) in outputHistory" :key="i" class="whitespace-pre-wrap break-all">
        <span v-if="line.type === 'stdout'" class="text-textBase">{{ line.text }}</span>
        <span v-else-if="line.type === 'stderr'" class="text-warning">{{ line.text }}</span>
        <span v-else-if="line.type === 'error'" class="text-error">{{ line.text }}</span>
        <span v-else-if="line.type === 'result'" class="text-primary">=> {{ line.text }}</span>
      </div>
    </div>
  </div>
</template>

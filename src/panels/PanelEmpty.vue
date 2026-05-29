<script setup lang="ts">
import { getPanelTypes } from '@/panels/registry'

const emit = defineEmits<{
  select: [typeId: string]
}>()

const panelTypes = getPanelTypes()
</script>

<template>
  <div class="h-full flex items-center justify-center bg-surface">
    <div class="text-center space-y-4">
      <p class="text-textMuted text-sm">选择面板类型</p>
      <div class="flex gap-3">
        <button
          v-for="pt in panelTypes"
          :key="pt.id"
          class="flex flex-col items-center gap-2 px-5 py-4 bg-bgBase rounded-lg border border-surfaceHover hover:border-primary cursor-pointer transition-colors"
          @click="emit('select', pt.id)"
        >
          <span :class="pt.icon" class="text-primary w-6 h-6" />
          <span class="text-textBase text-xs">{{ pt.label }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

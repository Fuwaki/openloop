<script setup lang="ts">
import { useLayout } from '@/composables/useLayout'
import { getViewPresets, type ViewPreset } from '@/views/registry'

const props = defineProps<{
  modelValue?: ViewPreset | null
}>()

const emit = defineEmits<{
  'update:modelValue': [view: ViewPreset]
}>()

const { setLayout } = useLayout()
const presets = getViewPresets()

function select(v: ViewPreset) {
  setLayout(v.layout)
  emit('update:modelValue', v)
}
</script>

<template>
  <div class="h-8 bg-bgBase border-b border-surfaceHover flex items-center px-2 gap-1 shrink-0">
    <button
      v-for="v in presets"
      :key="v.id"
      class="h-6 px-3 text-xs rounded transition-colors cursor-pointer"
      :class="modelValue?.id === v.id
        ? 'bg-primary/15 text-primary font-medium'
        : 'text-textMuted hover:text-textBase hover:bg-surfaceHover'"
      @click="select(v)"
    >
      {{ v.name }}
    </button>
  </div>
</template>

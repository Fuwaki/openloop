<script setup lang="ts">
defineProps<{
  modelValue: boolean
}>()

defineEmits<{
  'update:modelValue': [value: boolean]
}>()
</script>

<template>
  <button
    class="w-10 h-5 rounded-full transition-colors cursor-pointer relative overflow-hidden shrink-0"
    :class="modelValue ? 'bg-primary' : 'bg-surfaceHover'"
    @click="$emit('update:modelValue', !modelValue)"
  >
    <span
      class="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform"
      :class="modelValue ? 'translate-x-5' : 'translate-x-0'"
    />
  </button>
</template>

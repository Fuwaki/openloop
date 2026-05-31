<script setup lang="ts">
import { useToast } from '@/modules/app'
import type { ToastType } from '@/modules/app'

const { toasts, remove } = useToast()

const iconMap: Record<ToastType, string> = {
  error: 'i-carbon-warning-alt',
  warning: 'i-carbon-warning',
  info: 'i-carbon-information',
}

const colorMap: Record<ToastType, string> = {
  error: 'border-error text-error',
  warning: 'border-warning text-warning',
  info: 'border-primary text-primary',
}
</script>

<template>
  <Teleport to="body">
    <div class="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      <TransitionGroup name="toast">
        <div
          v-for="t in toasts"
          :key="t.id"
          class="pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-lg border bg-surface shadow-lg max-w-sm"
          :class="colorMap[t.type]"
        >
          <span :class="iconMap[t.type]" class="w-5 h-5 shrink-0 mt-0.5" />
          <span class="text-textBase text-sm leading-relaxed flex-1">{{ t.message }}</span>
          <button
            class="text-textMuted hover:text-textBase shrink-0 cursor-pointer"
            @click="remove(t.id)"
          >
            <span class="i-carbon-close w-4 h-4" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.25s ease;
}
.toast-enter-from {
  opacity: 0;
  transform: translateY(12px);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
</style>

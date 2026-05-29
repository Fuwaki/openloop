<script setup lang="ts">
import { ref } from 'vue'

defineProps<{
  title: string
  icon?: string
}>()

const emit = defineEmits<{
  close: []
  splitH: []
  splitV: []
}>()

const showMenu = ref(false)

function doAction(action: 'splitH' | 'splitV' | 'close') {
  if (action === 'splitH') emit('splitH')
  else if (action === 'splitV') emit('splitV')
  else emit('close')
  showMenu.value = false
}
</script>

<template>
  <div class="h-full flex flex-col bg-surface" @click="showMenu = false">
    <div class="flex items-center justify-between px-3 py-1.5 bg-bgBase border-b border-surfaceHover">
      <div class="flex items-center gap-2 min-w-0">
        <span v-if="icon" :class="icon" class="text-primary w-4 h-4 shrink-0" />
        <span class="text-textBase text-xs font-medium select-none truncate">{{ title }}</span>
      </div>
      <div class="flex items-center gap-1 relative shrink-0">
        <button
          class="text-textMuted hover:text-textBase w-6 h-6 flex items-center justify-center cursor-pointer"
          @click.stop="showMenu = !showMenu"
        >
          <span class="i-carbon-overflow-menu-vertical w-4 h-4" />
        </button>
        <button
          class="text-textMuted hover:text-error w-6 h-6 flex items-center justify-center cursor-pointer"
          @click="$emit('close')"
        >
          <span class="i-carbon-close w-4 h-4" />
        </button>

        <Transition name="menu">
          <div
            v-if="showMenu"
            class="absolute top-7 right-0 bg-surface border border-surfaceHover rounded-lg shadow-lg overflow-hidden min-w-40 z-20"
            @click.stop
          >
            <button
              class="flex items-center gap-2 w-full px-3 py-2 text-sm text-textBase hover:bg-surfaceHover cursor-pointer"
              @click="doAction('splitH')"
            >
              <span class="i-carbon-split-screen text-primary text-base" />
              水平分割
            </button>
            <button
              class="flex items-center gap-2 w-full px-3 py-2 text-sm text-textBase hover:bg-surfaceHover cursor-pointer"
              @click="doAction('splitV')"
            >
              <span class="i-carbon-split-screen text-primary text-base rotate-90" />
              垂直分割
            </button>
            <div class="border-t border-surfaceHover" />
            <button
              class="flex items-center gap-2 w-full px-3 py-2 text-sm text-error hover:bg-surfaceHover cursor-pointer"
              @click="doAction('close')"
            >
              <span class="i-carbon-close text-base" />
              关闭
            </button>
          </div>
        </Transition>
      </div>
    </div>
    <div class="flex-1 min-h-0 overflow-hidden">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.menu-enter-active,
.menu-leave-active {
  transition: opacity 0.12s, transform 0.12s;
}
.menu-enter-from,
.menu-leave-to {
  opacity: 0;
  transform: translateY(-2px);
}
</style>

<script setup lang="ts">
import { Splitpanes, Pane } from 'splitpanes'
import 'splitpanes/dist/splitpanes.css'

defineProps<{
  horizontal?: boolean
}>()
</script>

<template>
  <Splitpanes
    class="h-full"
    :horizontal="horizontal"
    :push-other-panes="false"
    :dbl-click-splitter="false"
  >
    <slot />
  </Splitpanes>
</template>

<style>
.splitpanes__splitter {
  background-color: var(--c-bg-surface-hover);
  position: relative;
}

.splitpanes__splitter::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: var(--c-text-muted);
  border-radius: 2px;
}

/* 垂直分割线 */
.splitpanes--vertical > .splitpanes__splitter::before {
  width: 4px;
  height: 24px;
}

/* 水平分割线 */
.splitpanes--horizontal > .splitpanes__splitter::before {
  width: 24px;
  height: 4px;
}

.splitpanes__splitter:hover::before {
  background-color: var(--c-primary);
}
</style>

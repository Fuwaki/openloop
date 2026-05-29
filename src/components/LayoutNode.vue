<script setup lang="ts">
import { Pane } from 'splitpanes'
import ResizablePanel from './ResizablePanel.vue'
import PanelFrame from '@/panels/PanelFrame.vue'
import { getPanelComponent } from '@/panels/registry'
import { panelMeta, type LayoutNode } from './layout-tree'

const props = defineProps<{
  node: LayoutNode
}>()

const emit = defineEmits<{
  remove: [id: string]
  split: [id: string, dir: 'h' | 'v']
  select: [id: string, typeId: string]
}>()

function isPanel(n: LayoutNode): n is Extract<LayoutNode, { type: 'panel' }> {
  return n.type === 'panel'
}
</script>

<template>
  <!-- 叶子面板 -->
  <Pane v-if="isPanel(node)" :min-size="10">
    <PanelFrame
      :title="panelMeta[node.panelType]?.title ?? node.panelType"
      :icon="panelMeta[node.panelType]?.icon"
      @close="emit('remove', node.id)"
      @split-h="emit('split', node.id, 'h')"
      @split-v="emit('split', node.id, 'v')"
    >
      <component
        :is="getPanelComponent(node.panelType)"
        @select="(typeId: string) => emit('select', node.id, typeId)"
      />
    </PanelFrame>
  </Pane>

  <!-- split 节点：嵌套 -->
  <Pane v-else :min-size="10">
    <ResizablePanel :horizontal="node.dir === 'v'">
      <LayoutNode
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        @remove="(id) => emit('remove', id)"
        @split="(id, dir) => emit('split', id, dir)"
        @select="(id, typeId) => emit('select', id, typeId)"
      />
    </ResizablePanel>
  </Pane>
</template>

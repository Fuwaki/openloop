<script setup lang="ts">
import ResizablePanel from './ResizablePanel.vue'
import LayoutNode from './LayoutNode.vue'
import { useLayout } from '@/modules/app'
import type { LayoutNode as LayoutNodeType } from './layout-tree'

const { root } = useLayout()

// ── 树操作 ──

function findAndRemove(node: LayoutNodeType, targetId: string): LayoutNodeType | null {
  if (node.id === targetId) return null
  if (node.type === 'panel') return node
  const newChildren = node.children
    .map((c) => findAndRemove(c, targetId))
    .filter((c): c is LayoutNodeType => c !== null)
  if (newChildren.length === 0) return null
  if (newChildren.length === 1) return newChildren[0]!
  return { ...node, children: newChildren }
}

function removePanel(id: string) {
  const result = findAndRemove(root.value, id)
  if (result) root.value = result
}

function findAndSplit(node: LayoutNodeType, targetId: string, dir: 'h' | 'v', newNode: LayoutNodeType): LayoutNodeType {
  if (node.id === targetId) {
    return { id: crypto.randomUUID(), type: 'split', dir, children: [node, newNode] }
  }
  if (node.type === 'panel') return node
  return { ...node, children: node.children.map((c) => findAndSplit(c, targetId, dir, newNode)) }
}

function splitPanel(targetId: string, dir: 'h' | 'v') {
  const newNode: LayoutNodeType = { id: crypto.randomUUID(), type: 'panel', panelType: 'empty' }
  root.value = findAndSplit(root.value, targetId, dir, newNode)
}

function findAndReplace(node: LayoutNodeType, targetId: string, newType: string): LayoutNodeType {
  if (node.id === targetId && node.type === 'panel') {
    return { ...node, panelType: newType }
  }
  if (node.type === 'split') {
    return { ...node, children: node.children.map((c) => findAndReplace(c, targetId, newType)) }
  }
  return node
}

function selectPanel(nodeId: string, typeId: string) {
  root.value = findAndReplace(root.value, nodeId, typeId)
}
</script>

<template>
  <div class="h-full relative">
    <ResizablePanel :horizontal="root.type === 'split' && root.dir === 'v'">
      <template v-if="root.type === 'split'">
        <LayoutNode
          v-for="child in root.children"
          :key="child.id"
          :node="child"
          @remove="removePanel"
          @split="splitPanel"
          @select="selectPanel"
        />
      </template>
      <template v-else>
        <LayoutNode :node="root" @remove="removePanel" @split="splitPanel" @select="selectPanel" />
      </template>
    </ResizablePanel>
  </div>
</template>


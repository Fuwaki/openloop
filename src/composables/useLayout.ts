import { ref } from 'vue'
import type { LayoutNode } from '@/components/layout-tree'

function uid() { return crypto.randomUUID() }

const root = ref<LayoutNode>({
  id: uid(),
  type: 'split',
  dir: 'h',
  children: [
    { id: uid(), type: 'panel', panelType: 'editor' },
    { id: uid(), type: 'panel', panelType: 'output' },
  ],
})

function setLayout(layout: LayoutNode) {
  root.value = layout
}

export function useLayout() {
  return { root, setLayout }
}

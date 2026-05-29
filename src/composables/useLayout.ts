import { ref } from 'vue'
import type { LayoutNode } from '@/components/layout-tree'
import { getViewPresets } from '@/views/registry'

const root = ref<LayoutNode>(getViewPresets()[0]!.layout)

function setLayout(layout: LayoutNode) {
  root.value = layout
}

export function useLayout() {
  return { root, setLayout }
}

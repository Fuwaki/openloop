import type { LayoutNode } from '@/components/layout-tree'

export interface ViewPreset {
  id: string
  name: string
  description: string
  icon: string
  layout: LayoutNode
}

function uid() { return crypto.randomUUID() }

function panel(panelType: string): LayoutNode {
  return { id: uid(), type: 'panel', panelType }
}

function split(dir: 'h' | 'v', ...children: LayoutNode[]): LayoutNode {
  return { id: uid(), type: 'split', dir, children }
}

const views: ViewPreset[] = [
  {
    id: 'simulation',
    name: '仿真',
    description: '沙盒 + 图表 + 输出 + 参数，完整仿真工作区',
    icon: 'i-carbon-play',
    layout: split('h',
      split('v', panel('sandbox'), panel('output')),
      split('v', panel('chart'), panel('params')),
    ),
  },
  {
    id: 'coding',
    name: '编码',
    description: '编辑器 + 输出，专注编写控制算法',
    icon: 'i-carbon-code',
    layout: split('h', panel('editor'), panel('output')),
  },
]

export function getViewPresets(): ViewPreset[] {
  return views
}

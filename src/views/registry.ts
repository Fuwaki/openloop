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
    id: 'coding',
    name: '编码',
    description: '编辑器 + 输出，专注编写控制算法',
    icon: 'i-carbon-code',
    layout: split('h', panel('editor'), panel('output')),
  },
  {
    id: 'debug',
    name: '调试',
    description: '编辑器 + 输出 + 参数调节，边写边调',
    icon: 'i-carbon-debug',
    layout: split('h',
      split('v', panel('editor'), panel('output')),
      panel('params'),
    ),
  },
  {
    id: 'analysis',
    name: '分析',
    description: '图表 + 参数，观察仿真结果和调参',
    icon: 'i-carbon-chart-venn-diagram',
    layout: split('h', panel('chart'), panel('params')),
  },
  {
    id: 'full',
    name: '全景',
    description: '编辑器 + 图表 + 输出 + 参数，完整工作区',
    icon: 'i-carbon-dashboard',
    layout: split('h',
      split('v', panel('editor'), panel('output')),
      split('v', panel('chart'), panel('params')),
    ),
  },
]

export function getViewPresets(): ViewPreset[] {
  return views
}

export function getViewPresetById(id: string): ViewPreset | undefined {
  return views.find((v) => v.id === id)
}

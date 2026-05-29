export interface PanelNode {
  id: string
  type: 'panel'
  panelType: string
}

export interface SplitNode {
  id: string
  type: 'split'
  dir: 'h' | 'v'
  children: LayoutNode[]
}

export type LayoutNode = PanelNode | SplitNode

export const panelMeta: Record<string, { title: string; icon: string }> = {
  chart: { title: '图表', icon: 'i-carbon-chart-line' },
  sandbox: { title: '沙盒', icon: 'i-carbon-cube' },
  editor: { title: '编辑器', icon: 'i-carbon-code' },
  output: { title: '输出', icon: 'i-carbon-terminal' },
  params: { title: '参数', icon: 'i-carbon-settings-adjust' },
  empty: { title: '选择面板', icon: 'i-carbon-add-alt' },
}

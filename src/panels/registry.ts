import type { Component } from 'vue'
import PanelChart from './PanelChart.vue'
import PanelEditor from './PanelEditor.vue'
import PanelParams from './PanelParams.vue'
import PanelSandbox from './PanelSandbox.vue'
import PanelOutput from './PanelOutput.vue'
import PanelEmpty from './PanelEmpty.vue'

export interface PanelType {
  id: string
  label: string
  icon: string
  component: Component
}

const panelTypes: PanelType[] = [
  { id: 'chart', label: '图表', icon: 'i-carbon-chart-line', component: PanelChart },
  { id: 'sandbox', label: '沙盒', icon: 'i-carbon-cube', component: PanelSandbox },
  { id: 'editor', label: '编辑器', icon: 'i-carbon-code', component: PanelEditor },
  { id: 'output', label: '输出', icon: 'i-carbon-terminal', component: PanelOutput },
  { id: 'params', label: '参数', icon: 'i-carbon-settings-adjust', component: PanelParams },
]

const allComponents: Record<string, Component> = {
  chart: PanelChart,
  sandbox: PanelSandbox,
  editor: PanelEditor,
  output: PanelOutput,
  params: PanelParams,
  empty: PanelEmpty,
}

export function getPanelTypes(): PanelType[] {
  return panelTypes
}

export function getPanelComponent(id: string): Component | undefined {
  return allComponents[id]
}

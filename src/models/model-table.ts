import type { PlantModel as SimPlant } from '@/simulation/plants/types'
import type { SandboxFrame, SandboxScene } from '@/sandbox/types'
import type { SystemTag, VarTag } from './tags'
import { createMassSpring } from '@/simulation/plants/massSpring'
import { createFirstOrder } from '@/simulation/plants/firstOrder'
import { createInvertedPendulum } from '@/simulation/plants/invertedPendulum'
import { createMassSpringScene } from '@/sandbox/scenes/massSpring'
import { createFirstOrderScene } from '@/sandbox/scenes/firstOrder'
import { createInvertedPendulumScene } from '@/sandbox/scenes/invertedPendulum'

/** 参数定义 */
export interface ParamDef {
  name: string
  value: number
  min: number
  max: number
  step: number
}

/** 单个变量的描述 */
export interface VarSpec {
  name: string
  unit: string
  description: string
  /** 语义/导数层级标签，用于与控制器匹配 */
  tags: VarTag[]
}

/** 模型 I/O 元数据 */
export interface IOSpec {
  /** 状态变量（即 controller 的输入） */
  stateVars: VarSpec[]
  /** 控制输出变量 */
  outputs: VarSpec[]
}

/** 模型表条目 */
export interface ModelEntry {
  id: string
  name: string
  category: 'linear' | 'nonlinear' | 'custom'
  description: string
  icon: string
  params: ParamDef[]
  /** 系统级标签 */
  systemTags: SystemTag[]
  /** I/O 元数据，用于代码生成 */
  ioSpec: IOSpec
  /** 创建仿真用 PlantModel */
  createPlant: (params?: Record<string, number>) => SimPlant
  /** 创建沙盒场景（可选） */
  createScene?: (frame: SandboxFrame, params: Record<string, number>) => SandboxScene
}

// ── 默认模型 ──

export const DEFAULT_MODEL_ID = 'mass-spring-damper'

// ── 模型表 ──

const modelTable: ModelEntry[] = [
  {
    id: 'mass-spring-damper',
    name: '质量-弹簧-阻尼',
    category: 'linear',
    description: '经典二阶系统 mẍ + cẋ + kx = F，控制理论入门模型',
    icon: 'i-carbon-3d-curve-auto-colon',
    params: [
      { name: 'm', value: 1, min: 0.1, max: 10, step: 0.1 },
      { name: 'c', value: 0.5, min: 0, max: 5, step: 0.1 },
      { name: 'k', value: 2, min: 0.1, max: 20, step: 0.1 },
    ],
    systemTags: ['linear'],
    ioSpec: {
      stateVars: [
        { name: 'x', unit: 'm', description: '位置', tags: ['position', 'derivative:0'] },
        { name: 'v', unit: 'm/s', description: '速度', tags: ['velocity', 'derivative:1'] },
      ],
      outputs: [
        { name: 'F', unit: 'N', description: '外力', tags: [] },
      ],
    },
    createPlant: (p) => createMassSpring(p as { m?: number; c?: number; k?: number }),
    createScene: (frame) => createMassSpringScene(frame),
  },
  {
    id: 'first-order',
    name: '一阶惯性系统',
    category: 'linear',
    description: '一阶惯性环节 τẋ + x = K·u，指数响应曲线',
    icon: 'i-carbon-chart-line-smoothing',
    params: [
      { name: 'τ', value: 1, min: 0.1, max: 10, step: 0.1 },
      { name: 'K', value: 1, min: 0.1, max: 10, step: 0.1 },
    ],
    systemTags: ['linear'],
    ioSpec: {
      stateVars: [
        { name: 'x', unit: '', description: '输出', tags: ['output', 'derivative:0'] },
      ],
      outputs: [
        { name: 'u', unit: '', description: '控制输入', tags: [] },
      ],
    },
    createPlant: (p) => createFirstOrder(p as { tau?: number; K?: number }),
    createScene: (frame, p) => createFirstOrderScene(frame, p),
  },
  {
    id: 'inverted-pendulum',
    name: '倒立摆',
    category: 'nonlinear',
    description: '经典非线性控制问题，小车-摆杆系统，状态空间建模',
    icon: 'i-carbon-balance',
    params: [
      { name: 'M', value: 0.5, min: 0.1, max: 5, step: 0.1 },
      { name: 'm', value: 0.2, min: 0.05, max: 2, step: 0.05 },
      { name: 'l', value: 0.3, min: 0.1, max: 2, step: 0.05 },
    ],
    systemTags: ['nonlinear'],
    ioSpec: {
      stateVars: [
        { name: 'x', unit: 'm', description: '小车位置', tags: ['position', 'derivative:0'] },
        { name: 'v', unit: 'm/s', description: '小车速度', tags: ['velocity', 'derivative:1'] },
        { name: 'theta', unit: 'rad', description: '摆杆角度', tags: ['angle', 'derivative:0'] },
        { name: 'omega', unit: 'rad/s', description: '摆杆角速度', tags: ['angular-velocity', 'derivative:1'] },
      ],
      outputs: [
        { name: 'F', unit: 'N', description: '水平力', tags: [] },
      ],
    },
    createPlant: (p) => createInvertedPendulum(p as { M?: number; m?: number; l?: number; g?: number }),
    createScene: (frame, p) => createInvertedPendulumScene(frame, p),
  },
]

// ── 查询函数 ──

export function getModelEntry(id: string): ModelEntry | undefined {
  return modelTable.find((m) => m.id === id)
}

export function getModelsByCategory(category: ModelEntry['category']): ModelEntry[] {
  return modelTable.filter((m) => m.category === category)
}

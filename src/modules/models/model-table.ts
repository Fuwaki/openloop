import type { PlantModel as SimPlant } from '@/simulation/plants/types'
import type { SandboxFrame, SandboxScene } from '@/sandbox/types'
import type { SystemTag } from './tags'
import { createMassSpring } from '@/simulation/plants/massSpring'
import { createFirstOrder } from '@/simulation/plants/firstOrder'
import { createInvertedPendulum } from '@/simulation/plants/invertedPendulum'
import { createMassSpringScene } from '@/sandbox/scenes/massSpring'
import { createFirstOrderScene } from '@/sandbox/scenes/firstOrder'
import { createInvertedPendulumScene } from '@/sandbox/scenes/invertedPendulum'
import iconMassSpring from '@/assets/icons/models/mass-spring-damper.svg?raw'
import iconFirstOrder from '@/assets/icons/models/first-order.svg?raw'
import iconInvertedPendulum from '@/assets/icons/models/inverted-pendulum.svg?raw'

/** 参数定义 */
export interface ParamDef {
  name: string
  value: number
  min: number
  max: number
  step: number
  /** 标记为环境参数（如重力），在环境配置 tab 中显示，不在模型参数面板中显示 */
  env?: boolean
}

/** 单个变量的描述 */
export interface VarSpec {
  name: string
  unit: string
  description: string
}

/** 模型 I/O 元数据 */
export interface IOSpec {
  /** 状态变量（即 controller 的输入） */
  stateVars: VarSpec[]
  /** 控制输出变量 */
  outputs: VarSpec[]
}

/** 默认控制目标。derivativeChain 按 0 阶、1 阶、2 阶...排列 */
export interface ControlObjective {
  id: string
  name: string
  description: string
  reference: number
  derivativeChain: string[]
  input: string
  /** 正控制输入是否让被控量朝正方向变化；倒立摆角度目标为 -1 */
  inputGainSign: 1 | -1
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
  /** 默认闭环控制目标 */
  controlObjective: ControlObjective
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
    icon: iconMassSpring,
    params: [
      { name: 'm', value: 1, min: 0.1, max: 10, step: 0.1 },
      { name: 'c', value: 0.5, min: 0, max: 5, step: 0.1 },
      { name: 'k', value: 2, min: 0.1, max: 20, step: 0.1 },
    ],
    systemTags: ['linear'],
    ioSpec: {
      stateVars: [
        { name: 'x', unit: 'm', description: '位置' },
        { name: 'v', unit: 'm/s', description: '速度' },
      ],
      outputs: [
        { name: 'F', unit: 'N', description: '外力' },
      ],
    },
    controlObjective: {
      id: 'position-regulation',
      name: '位置调节',
      description: '控制质量块位置 x 收敛到 0',
      reference: 0,
      derivativeChain: ['x', 'v'],
      input: 'F',
      inputGainSign: 1,
    },
    createPlant: (p) => createMassSpring(p as { m?: number; c?: number; k?: number }),
    createScene: (frame) => createMassSpringScene(frame),
  },
  {
    id: 'first-order',
    name: '一阶惯性系统',
    category: 'linear',
    description: '一阶惯性环节 τẋ + x = K·u，指数响应曲线',
    icon: iconFirstOrder,
    params: [
      { name: 'τ', value: 1, min: 0.1, max: 10, step: 0.1 },
      { name: 'K', value: 1, min: 0.1, max: 10, step: 0.1 },
    ],
    systemTags: ['linear'],
    ioSpec: {
      stateVars: [
        { name: 'x', unit: '', description: '输出' },
      ],
      outputs: [
        { name: 'u', unit: '', description: '控制输入' },
      ],
    },
    controlObjective: {
      id: 'output-regulation',
      name: '输出调节',
      description: '控制系统输出 x 收敛到 0',
      reference: 0,
      derivativeChain: ['x'],
      input: 'u',
      inputGainSign: 1,
    },
    createPlant: (p) => createFirstOrder(p as { tau?: number; K?: number }),
    createScene: (frame, p) => createFirstOrderScene(frame, p),
  },
  {
    id: 'inverted-pendulum',
    name: '倒立摆',
    category: 'nonlinear',
    description: '经典非线性控制问题，小车-摆杆系统，状态空间建模',
    icon: iconInvertedPendulum,
    params: [
      { name: 'M', value: 0.5, min: 0.1, max: 5, step: 0.1 },
      { name: 'm', value: 0.2, min: 0.05, max: 2, step: 0.05 },
      { name: 'l', value: 0.3, min: 0.1, max: 2, step: 0.05 },
      { name: 'g', value: 9.81, min: 0, max: 20, step: 0.1, env: true },
    ],
    systemTags: ['nonlinear'],
    ioSpec: {
      stateVars: [
        { name: 'x', unit: 'm', description: '小车位置' },
        { name: 'v', unit: 'm/s', description: '小车速度' },
        { name: 'theta', unit: 'rad', description: '摆杆角度' },
        { name: 'omega', unit: 'rad/s', description: '摆杆角速度' },
      ],
      outputs: [
        { name: 'F', unit: 'N', description: '水平力' },
      ],
    },
    controlObjective: {
      id: 'upright-angle',
      name: '摆杆直立',
      description: '控制摆杆角度 theta 收敛到 0',
      reference: 0,
      derivativeChain: ['theta', 'omega'],
      input: 'F',
      inputGainSign: -1,
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

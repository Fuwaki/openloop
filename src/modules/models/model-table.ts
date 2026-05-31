import type { PlantModel as SimPlant } from '@/simulation/plants/types'
import type { SandboxFrame, SandboxScene } from '@/sandbox/types'
import type { SystemTag } from './tags'
import { createMassSpring } from '@/simulation/plants/massSpring'
import { createFirstOrder } from '@/simulation/plants/firstOrder'
import { createInvertedPendulum } from '@/simulation/plants/invertedPendulum'
import { createDcMotor } from '@/simulation/plants/dcMotor'
import { createBallAndBeam } from '@/simulation/plants/ballAndBeam'
import { createMaglev } from '@/simulation/plants/maglev'
import { createMassSpringScene } from '@/sandbox/scenes/massSpring'
import { createFirstOrderScene } from '@/sandbox/scenes/firstOrder'
import { createInvertedPendulumScene } from '@/sandbox/scenes/invertedPendulum'
import { createDcMotorScene } from '@/sandbox/scenes/dcMotor'
import { createBallAndBeamScene } from '@/sandbox/scenes/ballAndBeam'
import { createMaglevScene } from '@/sandbox/scenes/maglev'
import { createTankLevel } from '@/simulation/plants/tankLevel'
import { createTankLevelScene } from '@/sandbox/scenes/tankLevel'
import { createDoublePendulum } from '@/simulation/plants/doublePendulum'
import { createDoublePendulumScene } from '@/sandbox/scenes/doublePendulum'
import iconMassSpring from '@/assets/icons/models/mass-spring-damper.svg?raw'
import iconFirstOrder from '@/assets/icons/models/first-order.svg?raw'
import iconInvertedPendulum from '@/assets/icons/models/inverted-pendulum.svg?raw'
import iconDcMotor from '@/assets/icons/models/dc-motor.svg?raw'
import iconBallAndBeam from '@/assets/icons/models/ball-and-beam.svg?raw'
import iconMaglev from '@/assets/icons/models/maglev.svg?raw'
import iconTankLevel from '@/assets/icons/models/tank-level.svg?raw'
import iconDoublePendulum from '@/assets/icons/models/double-pendulum.svg?raw'

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

/** 基准测试配置（给 test:convergence 用的"考题"） */
export interface BenchmarkConfig {
  /** 初始状态向量，归一化误差应接近 1.0 */
  initState: number[]
  /** 误差进入此带视为收敛（如 0.05 = ±5%） */
  settlingBand: number
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
  /** 基准测试配置 */
  benchmark: BenchmarkConfig
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
    benchmark: {
      initState: [1.0, 0.0],
      settlingBand: 0.05,
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
    benchmark: {
      initState: [1.0],
      settlingBand: 0.05,
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
    benchmark: {
      initState: [0.1, 0.0, 0.35, 0.0],
      settlingBand: 0.05,
    },
    createPlant: (p) => createInvertedPendulum(p as { M?: number; m?: number; l?: number; g?: number }),
    createScene: (frame, p) => createInvertedPendulumScene(frame, p),
  },
  {
    id: 'dc-motor',
    name: '直流电机',
    category: 'linear',
    description: '直流电机模型，电气-机械耦合系统',
    icon: iconDcMotor,
    params: [
      { name: 'J', value: 0.01, min: 0.001, max: 1, step: 0.001 },
      { name: 'b', value: 0.1, min: 0, max: 2, step: 0.01 },
      { name: 'Kt', value: 0.01, min: 0.001, max: 1, step: 0.001 },
      { name: 'Ke', value: 0.01, min: 0.001, max: 1, step: 0.001 },
      { name: 'R', value: 1, min: 0.1, max: 20, step: 0.1 },
      { name: 'L', value: 0.5, min: 0.01, max: 10, step: 0.01 },
    ],
    systemTags: ['linear'],
    ioSpec: {
      stateVars: [
        { name: 'theta', unit: 'rad', description: '转角' },
        { name: 'omega', unit: 'rad/s', description: '角速度' },
        { name: 'i', unit: 'A', description: '电流' },
      ],
      outputs: [
        { name: 'V', unit: 'V', description: '电压' },
      ],
    },
    controlObjective: {
      id: 'angle-regulation',
      name: '转角调节',
      description: '控制电机转角 theta 收敛到 0',
      reference: 0,
      derivativeChain: ['theta', 'omega'],
      input: 'V',
      inputGainSign: 1,
    },
    benchmark: {
      initState: [1.0, 0.0, 0.0],
      settlingBand: 0.05,
    },
    createPlant: (p) => createDcMotor(p as { J?: number; b?: number; Kt?: number; Ke?: number; R?: number; L?: number }),
    createScene: (frame, p) => createDcMotorScene(frame, p),
  },
  {
    id: 'ball-and-beam',
    name: '球杆系统',
    category: 'nonlinear',
    description: '球在可倾斜梁上滚动，欠驱动非线性系统',
    icon: iconBallAndBeam,
    params: [
      { name: 'g', value: 9.81, min: 0, max: 20, step: 0.1, env: true },
      { name: 'J_beam', value: 0.5, min: 0.01, max: 10, step: 0.01 },
      { name: 'L', value: 1.0, min: 0.2, max: 3, step: 0.1 },
    ],
    systemTags: ['nonlinear'],
    ioSpec: {
      stateVars: [
        { name: 'theta', unit: 'rad', description: '梁角度' },
        { name: 'omega', unit: 'rad/s', description: '梁角速度' },
        { name: 'x_b', unit: 'm', description: '球位置' },
        { name: 'v_b', unit: 'm/s', description: '球速度' },
      ],
      outputs: [
        { name: 'tau', unit: 'N·m', description: '梁力矩' },
      ],
    },
    controlObjective: {
      id: 'beam-angle-regulation',
      name: '梁角度调节',
      description: '控制梁角度 theta 收敛到 0，间接稳定球位置',
      reference: 0,
      derivativeChain: ['theta', 'omega'],
      input: 'tau',
      inputGainSign: 1,
    },
    benchmark: {
      initState: [0.0, 0.0, 0.5, 0.0],
      settlingBand: 0.05,
    },
    createPlant: (p) => createBallAndBeam(p as { g?: number; J_beam?: number; L?: number }),
    createScene: (frame, p) => createBallAndBeamScene(frame, p),
  },
  {
    id: 'maglev',
    name: '磁悬浮',
    category: 'nonlinear',
    description: '电磁铁悬浮球体，开环不稳定非线性系统',
    icon: iconMaglev,
    params: [
      { name: 'g', value: 9.81, min: 0, max: 20, step: 0.1, env: true },
      { name: 'k', value: 0.5, min: 0.01, max: 10, step: 0.01 },
      { name: 'y_eq', value: 0.5, min: 0.1, max: 2, step: 0.01 },
    ],
    systemTags: ['nonlinear'],
    ioSpec: {
      stateVars: [
        { name: 'y', unit: 'm', description: '高度' },
        { name: 'v', unit: 'm/s', description: '速度' },
      ],
      outputs: [
        { name: 'i', unit: 'A', description: '电流' },
      ],
    },
    controlObjective: {
      id: 'height-regulation',
      name: '悬浮高度调节',
      description: '控制球体高度 y 收敛到平衡位置 y_eq',
      reference: 0.5,
      derivativeChain: ['y', 'v'],
      input: 'i',
      inputGainSign: -1,
    },
    benchmark: {
      initState: [0.7, 0.0],
      settlingBand: 0.05,
    },
    createPlant: (p) => createMaglev(p as { g?: number; k?: number; y_eq?: number }),
    createScene: (frame, p) => createMaglevScene(frame, p),
  },
  {
    id: 'tank-level',
    name: '液位水箱',
    category: 'nonlinear',
    description: '非线性液位系统，出口流量与液位平方根成正比',
    icon: iconTankLevel,
    params: [
      { name: 'A', value: 1.0, min: 0.1, max: 10, step: 0.1 },
      { name: 'a', value: 0.5, min: 0.01, max: 5, step: 0.01 },
    ],
    systemTags: ['nonlinear'],
    ioSpec: {
      stateVars: [
        { name: 'h', unit: 'm', description: '液位' },
      ],
      outputs: [
        { name: 'u', unit: 'm³/s', description: '入口流量' },
      ],
    },
    controlObjective: {
      id: 'level-regulation',
      name: '液位调节',
      description: '控制液位 h 收敛到目标值',
      reference: 0.25,
      derivativeChain: ['h'],
      input: 'u',
      inputGainSign: 1,
    },
    benchmark: {
      initState: [0.8],
      settlingBand: 0.05,
    },
    createPlant: (p) => createTankLevel(p as { A?: number; a?: number }),
    createScene: (frame, p) => createTankLevelScene(frame, p),
  },
  {
    id: 'double-pendulum',
    name: '双摆',
    category: 'nonlinear',
    description: '双摆系统，经典混沌非线性动力学',
    icon: iconDoublePendulum,
    params: [
      { name: 'm1', value: 1.0, min: 0.1, max: 10, step: 0.1 },
      { name: 'm2', value: 1.0, min: 0.1, max: 10, step: 0.1 },
      { name: 'l1', value: 1.0, min: 0.1, max: 3, step: 0.1 },
      { name: 'l2', value: 1.0, min: 0.1, max: 3, step: 0.1 },
      { name: 'b1', value: 0.01, min: 0, max: 1, step: 0.001 },
      { name: 'b2', value: 0.01, min: 0, max: 1, step: 0.001 },
      { name: 'g', value: 9.81, min: 0, max: 20, step: 0.1, env: true },
    ],
    systemTags: ['nonlinear'],
    ioSpec: {
      stateVars: [
        { name: 'theta1', unit: 'rad', description: '连杆1角度' },
        { name: 'omega1', unit: 'rad/s', description: '连杆1角速度' },
        { name: 'theta2', unit: 'rad', description: '连杆2角度' },
        { name: 'omega2', unit: 'rad/s', description: '连杆2角速度' },
      ],
      outputs: [
        { name: 'tau', unit: 'N·m', description: '关节1力矩' },
      ],
    },
    controlObjective: {
      id: 'theta1-regulation',
      name: '连杆1角度调节',
      description: '控制连杆1角度 theta1 收敛到 0（竖直向下）',
      reference: 0,
      derivativeChain: ['theta1', 'omega1'],
      input: 'tau',
      inputGainSign: 1,
    },
    benchmark: {
      initState: [0.3, 0.0, 0.0, 0.0],
      settlingBand: 0.05,
    },
    createPlant: (p) => createDoublePendulum(p as { m1?: number; m2?: number; l1?: number; l2?: number; b1?: number; b2?: number; g?: number }),
    createScene: (frame, p) => createDoublePendulumScene(frame, p),
  },
]

// ── 查询函数 ──

export function getModelEntry(id: string): ModelEntry | undefined {
  return modelTable.find((m) => m.id === id)
}

export function getModelsByCategory(category: ModelEntry['category']): ModelEntry[] {
  return modelTable.filter((m) => m.category === category)
}

export function getAllModels(): ModelEntry[] {
  return modelTable
}

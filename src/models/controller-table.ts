import type { ModelEntry } from './model-table'
import type { MatchResult, SystemTag } from './tags'

// ── 从 .py 文件导入控制器实现 ──
import pidCode from '@/python/controllers/pid.py?raw'
import pdCode from '@/python/controllers/pd.py?raw'
import leadLagCode from '@/python/controllers/lead_lag.py?raw'
import slidingModeCode from '@/python/controllers/sliding_mode.py?raw'
import feedbackLinearCode from '@/python/controllers/feedback_linearization.py?raw'
import backsteppingCode from '@/python/controllers/backstepping.py?raw'
import lqrCode from '@/python/controllers/lqr.py?raw'
import lqgCode from '@/python/controllers/lqg.py?raw'
import mpcCode from '@/python/controllers/mpc.py?raw'
import robustHinfCode from '@/python/controllers/robust_hinf.py?raw'
import mracCode from '@/python/controllers/mrac.py?raw'
import fuzzyCode from '@/python/controllers/fuzzy.py?raw'
import neuralNetCode from '@/python/controllers/neural_net.py?raw'

// ── 从 .svg 文件导入图标 ──
import pidIcon from '@/assets/icons/controllers/pid.svg?raw'
import pdIcon from '@/assets/icons/controllers/pd.svg?raw'
import leadLagIcon from '@/assets/icons/controllers/lead_lag.svg?raw'
import slidingModeIcon from '@/assets/icons/controllers/sliding_mode.svg?raw'
import feedbackLinearIcon from '@/assets/icons/controllers/feedback_linearization.svg?raw'
import backsteppingIcon from '@/assets/icons/controllers/backstepping.svg?raw'
import lqrIcon from '@/assets/icons/controllers/lqr.svg?raw'
import lqgIcon from '@/assets/icons/controllers/lqg.svg?raw'
import mpcIcon from '@/assets/icons/controllers/mpc.svg?raw'
import robustHinfIcon from '@/assets/icons/controllers/robust_hinf.svg?raw'
import mracIcon from '@/assets/icons/controllers/mrac.svg?raw'
import fuzzyIcon from '@/assets/icons/controllers/fuzzy.svg?raw'
import neuralNetIcon from '@/assets/icons/controllers/neural_net.svg?raw'

// ── 空控制器（无控制器选中时的默认模板） ──
import emptyCode from '@/python/controllers/empty.py?raw'
export { emptyCode }

export type ControllerCategory = 'linear' | 'nonlinear' | 'optimal' | 'robust' | 'adaptive' | 'heuristic'
export type GenerationMode = 'generic' | 'model-specific'

/** 控制器参数定义 */
export interface ControllerParamDef {
  name: string
  value: number
  min: number
  max: number
  step: number
}

export interface ControllerVariant {
  id: string
  name: string
  description: string
  params: ControllerParamDef[]
  /** 控制目标导数链最小长度。1=q，2=q+q_dot。 */
  minOrder: number
  maxOrder?: number
  requiredSystemTags?: SystemTag[]
  generationMode: GenerationMode
  starterCode?: string
  modelTemplates?: Record<string, string>
}

/** 控制器族：侧栏展示的一级入口 */
export interface ControllerFamily {
  id: string
  name: string
  category: ControllerCategory
  description: string
  icon: string
  variants: ControllerVariant[]
}

export interface ControllerSelection {
  family: ControllerFamily
  variant: ControllerVariant
}

const pidParams: ControllerParamDef[] = [
  { name: 'Kp', value: 10, min: 0, max: 100, step: 0.1 },
  { name: 'Ki', value: 1, min: 0, max: 50, step: 0.1 },
  { name: 'Kd', value: 2, min: 0, max: 20, step: 0.1 },
]

const pdParams: ControllerParamDef[] = [
  { name: 'Kp', value: 10, min: 0, max: 100, step: 0.1 },
  { name: 'Kd', value: 2, min: 0, max: 20, step: 0.1 },
]

const slidingParams: ControllerParamDef[] = [
  { name: 'c', value: 5, min: 0.5, max: 20, step: 0.5 },
  { name: 'eta', value: 2, min: 0.1, max: 10, step: 0.1 },
]

const controllerFamilies: ControllerFamily[] = [
  {
    id: 'pid',
    name: 'PID',
    category: 'linear',
    description: '比例-积分-微分控制器，支持带 global 状态的积分项',
    icon: pidIcon,
    variants: [
      {
        id: 'pid-stateful',
        name: '状态 PID',
        description: '使用被控量误差，并通过 Python global 保存积分状态',
        params: pidParams,
        minOrder: 1,
        generationMode: 'generic',
        starterCode: pidCode,
      },
    ],
  },
  {
    id: 'pd',
    name: 'PD',
    category: 'linear',
    description: '比例-微分控制器，适用于二阶目标链的快速调节',
    icon: pdIcon,
    variants: [
      {
        id: 'pd-second-order',
        name: '二阶 PD',
        description: '使用被控量 q 与一阶量 q_dot 形成阻尼反馈',
        params: pdParams,
        minOrder: 2,
        generationMode: 'generic',
        starterCode: pdCode,
      },
    ],
  },
  {
    id: 'lead-lag',
    name: '超前-滞后补偿',
    category: 'linear',
    description: '频域补偿器，通过内部状态近似补偿动态',
    icon: leadLagIcon,
    variants: [
      {
        id: 'lead-lag-first-order',
        name: '一阶超前-滞后',
        description: '面向单输出目标的离散状态补偿模板',
        params: [
          { name: 'K', value: 1, min: 0.1, max: 10, step: 0.1 },
          { name: 'z', value: 1, min: 0.1, max: 10, step: 0.1 },
          { name: 'p', value: 10, min: 1, max: 100, step: 0.5 },
        ],
        minOrder: 1,
        generationMode: 'generic',
        starterCode: leadLagCode,
      },
    ],
  },
  {
    id: 'sliding-mode',
    name: '滑模控制',
    category: 'nonlinear',
    description: '变结构控制，按目标阶数选择滑模面结构',
    icon: slidingModeIcon,
    variants: [
      {
        id: 'sliding-first-order',
        name: '一阶滑模',
        description: '只依赖被控误差 e 的切换控制模板',
        params: [{ name: 'eta', value: 2, min: 0.1, max: 10, step: 0.1 }],
        minOrder: 1,
        maxOrder: 1,
        generationMode: 'generic',
        starterCode: slidingModeCode,
      },
      {
        id: 'sliding-second-order',
        name: '二阶滑模',
        description: '使用 s = e_dot + c e 的二阶目标链滑模模板',
        params: slidingParams,
        minOrder: 2,
        generationMode: 'generic',
        starterCode: slidingModeCode,
      },
    ],
  },
  {
    id: 'feedback-linearization',
    name: '反馈线性化',
    category: 'nonlinear',
    description: '依赖具体模型动力学的非线性精确线性化方法',
    icon: feedbackLinearIcon,
    variants: [
      {
        id: 'feedback-linearization-model',
        name: '模型专用反馈线性化',
        description: '需要当前模型提供专用控制律模板',
        params: [],
        minOrder: 2,
        requiredSystemTags: ['nonlinear'],
        generationMode: 'model-specific',
        modelTemplates: {
          'inverted-pendulum': feedbackLinearCode,
        },
      },
    ],
  },
  {
    id: 'backstepping',
    name: '反步法',
    category: 'nonlinear',
    description: '递归构造 Lyapunov 函数，通常依赖严格反馈模型结构',
    icon: backsteppingIcon,
    variants: [
      {
        id: 'backstepping-model',
        name: '模型专用反步法',
        description: '优先使用模型专用模板；没有模板时禁用',
        params: [
          { name: 'c1', value: 5, min: 0.5, max: 20, step: 0.5 },
          { name: 'c2', value: 3, min: 0.5, max: 20, step: 0.5 },
        ],
        minOrder: 2,
        requiredSystemTags: ['nonlinear'],
        generationMode: 'model-specific',
        modelTemplates: {
          'inverted-pendulum': backsteppingCode,
        },
      },
    ],
  },
  {
    id: 'lqr',
    name: 'LQR',
    category: 'optimal',
    description: '线性二次调节器，最小化状态偏差与控制能量',
    icon: lqrIcon,
    variants: [
      {
        id: 'lqr-second-order',
        name: '二阶目标 LQR',
        description: '使用目标二阶状态 [q, q_dot] 的示例增益模板',
        params: [
          { name: 'q1', value: 10, min: 0.1, max: 100, step: 0.5 },
          { name: 'q2', value: 1, min: 0.1, max: 100, step: 0.5 },
          { name: 'r', value: 0.1, min: 0.01, max: 10, step: 0.01 },
        ],
        minOrder: 2,
        generationMode: 'generic',
        starterCode: lqrCode,
      },
    ],
  },
  {
    id: 'lqg',
    name: 'LQG',
    category: 'optimal',
    description: 'LQR + Kalman 滤波，当前提供二阶目标链示例模板',
    icon: lqgIcon,
    variants: [
      {
        id: 'lqg-second-order',
        name: '二阶目标 LQG',
        description: '使用目标二阶状态的 LQG 框架模板',
        params: [
          { name: 'q1', value: 10, min: 0.1, max: 100, step: 0.5 },
          { name: 'r', value: 0.1, min: 0.01, max: 10, step: 0.01 },
          { name: 'L1', value: 1, min: 0.1, max: 10, step: 0.1 },
        ],
        minOrder: 2,
        generationMode: 'generic',
        starterCode: lqgCode,
      },
    ],
  },
  {
    id: 'mpc',
    name: 'MPC',
    category: 'optimal',
    description: '模型预测控制，当前提供目标链框架模板',
    icon: mpcIcon,
    variants: [
      {
        id: 'mpc-objective',
        name: '目标链 MPC 框架',
        description: '生成 MPC 代码骨架，用户补充预测模型和约束',
        params: [
          { name: 'N', value: 20, min: 5, max: 100, step: 1 },
          { name: 'dt', value: 0.01, min: 0.001, max: 0.1, step: 0.001 },
        ],
        minOrder: 1,
        generationMode: 'generic',
        starterCode: mpcCode,
      },
    ],
  },
  {
    id: 'robust-hinf',
    name: 'H∞ 控制',
    category: 'robust',
    description: '鲁棒控制方法，需要模型结构或专用综合结果',
    icon: robustHinfIcon,
    variants: [
      {
        id: 'hinf-model',
        name: '模型专用 H∞',
        description: '没有模型专用模板时禁用',
        params: [],
        minOrder: 2,
        requiredSystemTags: ['linear'],
        generationMode: 'model-specific',
        modelTemplates: {
          'mass-spring-damper': robustHinfCode,
        },
      },
    ],
  },
  {
    id: 'mrac',
    name: 'MRAC',
    category: 'adaptive',
    description: '模型参考自适应控制，在线调整参数跟踪参考模型',
    icon: mracIcon,
    variants: [
      {
        id: 'mrac-first-order',
        name: '一阶 MRAC',
        description: '面向单输出目标的一阶自适应控制框架',
        params: [
          { name: 'am', value: 5, min: 0.5, max: 20, step: 0.5 },
          { name: 'gamma', value: 1, min: 0.1, max: 10, step: 0.1 },
        ],
        minOrder: 1,
        generationMode: 'generic',
        starterCode: mracCode,
      },
    ],
  },
  {
    id: 'fuzzy',
    name: '模糊控制',
    category: 'heuristic',
    description: '基于误差和误差变化率的启发式控制',
    icon: fuzzyIcon,
    variants: [
      {
        id: 'fuzzy-second-order',
        name: '二阶模糊控制',
        description: '使用 e 与 e_dot 的模糊控制模板',
        params: [
          { name: 'Ke', value: 3, min: 0.1, max: 20, step: 0.1 },
          { name: 'Kec', value: 1, min: 0.1, max: 10, step: 0.1 },
          { name: 'Ku', value: 5, min: 0.1, max: 20, step: 0.1 },
        ],
        minOrder: 2,
        generationMode: 'generic',
        starterCode: fuzzyCode,
      },
    ],
  },
  {
    id: 'neural-net',
    name: '神经网络控制',
    category: 'heuristic',
    description: '前馈神经网络逼近目标链控制律',
    icon: neuralNetIcon,
    variants: [
      {
        id: 'neural-net-second-order',
        name: '二阶神经网络控制',
        description: '输入 [q-ref, q_dot] 的前馈网络模板',
        params: [
          { name: 'hidden', value: 8, min: 2, max: 64, step: 1 },
          { name: 'lr', value: 0.01, min: 0.001, max: 1, step: 0.001 },
        ],
        minOrder: 2,
        generationMode: 'generic',
        starterCode: neuralNetCode,
      },
    ],
  },
]

export function matchControllerVariant(model: ModelEntry, variant: ControllerVariant): MatchResult {
  const order = model.controlObjective.derivativeChain.length
  if (order < variant.minOrder) {
    return { compatible: false, reason: `需要 ${variant.minOrder} 阶目标链，当前只有 ${order} 阶` }
  }
  if (variant.maxOrder !== undefined && order > variant.maxOrder) {
    return { compatible: false, reason: `只适用于 ${variant.maxOrder} 阶目标链，当前是 ${order} 阶` }
  }
  for (const tag of variant.requiredSystemTags ?? []) {
    if (!model.systemTags.includes(tag)) {
      return { compatible: false, reason: `需要 ${tag} 系统` }
    }
  }
  if (variant.generationMode === 'generic' && !variant.starterCode) {
    return { compatible: false, reason: '缺少通用模板' }
  }
  if (variant.generationMode === 'model-specific' && !variant.modelTemplates?.[model.id]) {
    return { compatible: false, reason: '当前模型没有专用实现' }
  }
  return { compatible: true }
}

export function matchControllerFamily(model: ModelEntry | null, family: ControllerFamily): MatchResult {
  if (!model) return { compatible: true }
  const compatible = family.variants.some((variant) => matchControllerVariant(model, variant).compatible)
  return compatible ? { compatible: true } : { compatible: false, reason: '当前模型没有可用变种' }
}

export function resolveVariantCode(model: ModelEntry, variant: ControllerVariant): string | null {
  if (variant.generationMode === 'generic') return variant.starterCode ?? null
  return variant.modelTemplates?.[model.id] ?? null
}

export function getControllerFamily(id: string): ControllerFamily | undefined {
  return controllerFamilies.find((c) => c.id === id)
}

export function getControllerVariant(familyId: string, variantId: string): ControllerSelection | undefined {
  const family = getControllerFamily(familyId)
  const variant = family?.variants.find((v) => v.id === variantId)
  return family && variant ? { family, variant } : undefined
}

export function getControllersByCategory(category: ControllerCategory): ControllerFamily[] {
  return controllerFamilies.filter((c) => c.category === category)
}

export function getAllControllers(): ControllerFamily[] {
  return controllerFamilies
}

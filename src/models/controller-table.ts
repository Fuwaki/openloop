import type { SystemTag, InputRequirement } from './tags'

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

/** 控制器参数定义 */
export interface ControllerParamDef {
  name: string
  value: number
  min: number
  max: number
  step: number
}

/** 控制器表条目 */
export interface ControllerEntry {
  id: string
  name: string
  category: 'linear' | 'nonlinear' | 'optimal' | 'robust' | 'adaptive' | 'heuristic'
  description: string
  icon: string
  params: ControllerParamDef[]
  starterCode: string
  /** 需要模型具备的系统标签（空=无要求） */
  requiredSystemTags: SystemTag[]
  /** 对状态变量的输入需求（AND 关系，每个需求内 OR） */
  inputRequirements: InputRequirement[]
}

// ── 常用输入需求模板 ──

/** 只需一个被控量（位置/角度/输出） */
const singleInput: InputRequirement[] = [
  { acceptableTags: ['position', 'angle', 'output'], description: '被控量' },
]

/** 需要被控量 + 其变化率（位置+速度 或 角度+角速度） */
const posAndVel: InputRequirement[] = [
  { acceptableTags: ['position', 'angle', 'output'], description: '被控量' },
  { acceptableTags: ['velocity', 'angular-velocity'], description: '被控量变化率' },
]

// ── 控制器表 ──

const controllerTable: ControllerEntry[] = [
  // 线性控制器
  {
    id: 'pid',
    name: 'PID',
    category: 'linear',
    description: '比例-积分-微分控制器，工业控制中最经典的反馈控制器',
    icon: pidIcon,
    params: [
      { name: 'Kp', value: 10, min: 0, max: 100, step: 0.1 },
      { name: 'Ki', value: 1, min: 0, max: 50, step: 0.1 },
      { name: 'Kd', value: 2, min: 0, max: 20, step: 0.1 },
    ],
    starterCode: pidCode,
    requiredSystemTags: [],
    inputRequirements: singleInput,
  },
  {
    id: 'pd',
    name: 'PD',
    category: 'linear',
    description: '比例-微分控制器，适用于无稳态误差要求的快速响应系统',
    icon: pdIcon,
    params: [
      { name: 'Kp', value: 10, min: 0, max: 100, step: 0.1 },
      { name: 'Kd', value: 2, min: 0, max: 20, step: 0.1 },
    ],
    starterCode: pdCode,
    requiredSystemTags: [],
    inputRequirements: posAndVel,
  },
  {
    id: 'lead-lag',
    name: '超前-滞后补偿',
    category: 'linear',
    description: '频域补偿器，通过调整零极点位置改善相位裕度和稳态精度',
    icon: leadLagIcon,
    params: [
      { name: 'K', value: 1, min: 0.1, max: 10, step: 0.1 },
      { name: 'z', value: 1, min: 0.1, max: 10, step: 0.1 },
      { name: 'p', value: 10, min: 1, max: 100, step: 0.5 },
    ],
    starterCode: leadLagCode,
    requiredSystemTags: [],
    inputRequirements: singleInput,
  },

  // 非线性控制器
  {
    id: 'sliding-mode',
    name: '滑模控制',
    category: 'nonlinear',
    description: '变结构控制，沿滑模面切换，对不确定性和扰动具有强鲁棒性',
    icon: slidingModeIcon,
    params: [
      { name: 'c', value: 5, min: 0.5, max: 20, step: 0.5 },
      { name: 'eta', value: 2, min: 0.1, max: 10, step: 0.1 },
    ],
    starterCode: slidingModeCode,
    requiredSystemTags: [],
    inputRequirements: posAndVel,
  },
  {
    id: 'feedback-linearization',
    name: '反馈线性化',
    category: 'nonlinear',
    description: '通过非线性坐标变换将系统精确线性化，再用线性方法设计',
    icon: feedbackLinearIcon,
    params: [],
    starterCode: feedbackLinearCode,
    requiredSystemTags: ['nonlinear'],
    inputRequirements: posAndVel,
  },
  {
    id: 'backstepping',
    name: '反步法',
    category: 'nonlinear',
    description: '递归构造 Lyapunov 函数的系统化设计方法，适用于严格反馈系统',
    icon: backsteppingIcon,
    params: [
      { name: 'c1', value: 5, min: 0.5, max: 20, step: 0.5 },
      { name: 'c2', value: 3, min: 0.5, max: 20, step: 0.5 },
    ],
    starterCode: backsteppingCode,
    requiredSystemTags: ['nonlinear'],
    inputRequirements: posAndVel,
  },

  // 最优控制
  {
    id: 'lqr',
    name: 'LQR',
    category: 'optimal',
    description: '线性二次调节器，最小化状态偏差与控制能量的加权和',
    icon: lqrIcon,
    params: [
      { name: 'q1', value: 10, min: 0.1, max: 100, step: 0.5 },
      { name: 'q2', value: 1, min: 0.1, max: 100, step: 0.5 },
      { name: 'r', value: 0.1, min: 0.01, max: 10, step: 0.01 },
    ],
    starterCode: lqrCode,
    requiredSystemTags: ['linear'],
    inputRequirements: posAndVel,
  },
  {
    id: 'lqg',
    name: 'LQG',
    category: 'optimal',
    description: '线性二次高斯控制，LQR + Kalman 滤波，适用于含噪声系统',
    icon: lqgIcon,
    params: [
      { name: 'q1', value: 10, min: 0.1, max: 100, step: 0.5 },
      { name: 'r', value: 0.1, min: 0.01, max: 10, step: 0.01 },
      { name: 'L1', value: 1, min: 0.1, max: 10, step: 0.1 },
    ],
    starterCode: lqgCode,
    requiredSystemTags: ['linear'],
    inputRequirements: posAndVel,
  },
  {
    id: 'mpc',
    name: 'MPC',
    category: 'optimal',
    description: '模型预测控制，滚动优化，可处理约束，工业应用最广泛',
    icon: mpcIcon,
    params: [
      { name: 'N', value: 20, min: 5, max: 100, step: 1 },
      { name: 'dt', value: 0.01, min: 0.001, max: 0.1, step: 0.001 },
    ],
    starterCode: mpcCode,
    requiredSystemTags: [],
    inputRequirements: posAndVel,
  },

  // 鲁棒控制
  {
    id: 'robust-hinf',
    name: 'H∞ 控制',
    category: 'robust',
    description: '最小化闭环传递函数的 H∞ 范数，对模型不确定性具有最优鲁棒性',
    icon: robustHinfIcon,
    params: [],
    starterCode: robustHinfCode,
    requiredSystemTags: ['linear'],
    inputRequirements: posAndVel,
  },

  // 自适应控制
  {
    id: 'mrac',
    name: 'MRAC',
    category: 'adaptive',
    description: '模型参考自适应控制，在线调整参数使系统跟踪参考模型',
    icon: mracIcon,
    params: [
      { name: 'am', value: 5, min: 0.5, max: 20, step: 0.5 },
      { name: 'gamma', value: 1, min: 0.1, max: 10, step: 0.1 },
    ],
    starterCode: mracCode,
    requiredSystemTags: [],
    inputRequirements: singleInput,
  },

  // 启发式/智能控制
  {
    id: 'fuzzy',
    name: '模糊控制',
    category: 'heuristic',
    description: '基于模糊规则和隶属度函数的控制，无需精确数学模型，工业应用广泛',
    icon: fuzzyIcon,
    params: [
      { name: 'Ke', value: 3, min: 0.1, max: 20, step: 0.1 },
      { name: 'Kec', value: 1, min: 0.1, max: 10, step: 0.1 },
      { name: 'Ku', value: 5, min: 0.1, max: 20, step: 0.1 },
    ],
    starterCode: fuzzyCode,
    requiredSystemTags: [],
    inputRequirements: posAndVel,
  },
  {
    id: 'neural-net',
    name: '神经网络控制',
    category: 'heuristic',
    description: '前馈神经网络逼近控制律，适用于难以建模的复杂非线性系统',
    icon: neuralNetIcon,
    params: [
      { name: 'hidden', value: 8, min: 2, max: 64, step: 1 },
      { name: 'lr', value: 0.01, min: 0.001, max: 1, step: 0.001 },
    ],
    starterCode: neuralNetCode,
    requiredSystemTags: [],
    inputRequirements: singleInput,
  },
]

// ── 查询函数 ──

export function getControllerEntry(id: string): ControllerEntry | undefined {
  return controllerTable.find((c) => c.id === id)
}

export function getControllersByCategory(category: ControllerEntry['category']): ControllerEntry[] {
  return controllerTable.filter((c) => c.category === category)
}

/** 获取所有控制器 */
export function getAllControllers(): ControllerEntry[] {
  return controllerTable
}

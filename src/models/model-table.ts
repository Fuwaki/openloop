import type { PlantModel as SimPlant } from '@/simulation/plants/types'
import type { SandboxFrame, SandboxScene } from '@/sandbox/types'
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

/** 模型表条目 */
export interface ModelEntry {
  id: string
  name: string
  category: 'linear' | 'nonlinear' | 'custom'
  description: string
  icon: string
  params: ParamDef[]
  /** 创建仿真用 PlantModel */
  createPlant: (params?: Record<string, number>) => SimPlant
  /** 创建沙盒场景（可选） */
  createScene?: (frame: SandboxFrame, params: Record<string, number>) => SandboxScene
  /** 编辑器 starter 代码 */
  starterCode: string
}

// ── Starter Code ──

const massSpringCode = `import numpy as np

# 质量-弹簧-阻尼系统控制器
# 微分方程: mẍ + cẋ + kx = F
# 状态: [x, v] — 位置 (m)、速度 (m/s)
# 输出: F — 外力 (N)

def controller(state, t):
    x, v = state

    # PID 控制器示例
    Kp = 10.0
    Ki = 1.0
    Kd = 2.0

    # 目标位置
    x_ref = 0.0

    # TODO: 在这里实现你的控制算法
    error = x_ref - x
    F = Kp * error - Kd * v

    return F
`

const firstOrderCode = `import numpy as np

# 一阶惯性系统控制器
# 微分方程: τ ẋ + x = K·u
# 状态: [x] — 输出
# 输出: u — 控制输入

def controller(state, t):
    x = state[0]

    # 目标值
    x_ref = 1.0

    # TODO: 在这里实现你的控制算法
    Kp = 3.0

    error = x_ref - x
    u = Kp * error

    return u
`

const invertedPendulumCode = `import numpy as np

# 倒立摆控制器
# 状态: [x, v, θ, ω] — 小车位置 (m)、速度 (m/s)、摆杆角度 (rad)、角速度 (rad/s)
# 输出: F — 水平力 (N)

def controller(state, t):
    x, v, theta, omega = state

    # LQR 增益示例（小角度近似）
    K = np.array([1.0, 1.5, 30.0, 5.0])
    x_ref = np.array([0, 0, 0, 0])

    # TODO: 在这里实现你的控制算法
    error = x_ref - state
    F = -K @ error

    return F
`

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
    createPlant: (p) => createMassSpring(p as { m?: number; c?: number; k?: number }),
    createScene: (frame) => createMassSpringScene(frame),
    starterCode: massSpringCode,
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
    createPlant: (p) => createFirstOrder(p as { tau?: number; K?: number }),
    createScene: (frame, p) => createFirstOrderScene(frame, p),
    starterCode: firstOrderCode,
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
    createPlant: (p) => createInvertedPendulum(p as { M?: number; m?: number; l?: number; g?: number }),
    createScene: (frame, p) => createInvertedPendulumScene(frame, p),
    starterCode: invertedPendulumCode,
  },
]

// ── 查询函数 ──

export function getModelEntry(id: string): ModelEntry | undefined {
  return modelTable.find((m) => m.id === id)
}

export function getModelsByCategory(category: ModelEntry['category']): ModelEntry[] {
  return modelTable.filter((m) => m.category === category)
}

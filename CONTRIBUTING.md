# 贡献指南

感谢你对 OpenLoop 的兴趣。这个文档会告诉你项目的架构设计，以及如何贡献新的模型、控制器或其他功能。

## 核心设计原则

**开闭原则 (Open-Closed Principle)** 是这个项目最重要的架构约束。

项目的仿真引擎、代码生成器、沙盒渲染器、面板系统——所有核心模块都是**对扩展开放、对修改关闭**的。具体来说：

- **添加新模型**：在 `model-table.ts` 注册一个条目，写一个 `PlantModel` 实现。引擎代码零修改。
- **添加新控制器**：写一个 `.py` 模板文件，在 `controller-table.ts` 注册一个条目。代码生成器零修改。
- **添加新绘图基元**：写一个 `DrawFn<T>` 函数，在 `drawRegistry.ts` 注册。渲染器零修改。

这靠三个机制实现：

1. **注册表模式** — 模型、控制器、绘图基元各自维护一个注册表（数组或 Map），核心逻辑只操作注册表的抽象接口，不关心具体实现。
2. **接口驱动** — `SystemModel`、`PlantModel`、`ControllerVariant`、`Drawable<T>` 等接口定义了契约，具体实现只需满足接口。
3. **声明式元数据** — 控制器通过 `minOrder`、`requiredSystemTags`、`generationMode` 等字段声明自己的需求，平台自动完成兼容性匹配，不需要硬编码 `if/else`。

**请遵守这个原则。** 如果你的改动需要在引擎、渲染器或代码生成器中加 `if model.id === 'xxx'`，说明架构被破坏了——请通过接口或注册表解决。

## 项目结构

```
src/
├── components/              # UI 组件
│   ├── Sidebar.vue          # 侧栏（模型/控制器选择器）
│   ├── CodeEditor.vue       # Monaco 编辑器封装
│   ├── ControllerPopup.vue  # 控制器变种选择弹窗
│   ├── PanelManager.vue     # 面板布局管理器
│   ├── LayoutNode.vue       # 树结构面板节点
│   ├── ResizablePanel.vue   # splitpanes 封装
│   ├── RightPanel.vue       # 右侧检查器面板
│   ├── SettingsModal.vue    # 设置弹窗（主题/仿真参数）
│   └── layout-tree.ts       # 面板树结构类型定义
│
├── composables/             # Vue 组合式函数（核心业务逻辑）
│   ├── useSimulationRunner.ts  # 仿真循环（requestAnimationFrame tick）
│   ├── useSimulationState.ts   # 全局仿真状态（状态向量、历史、统计）
│   ├── usePyodide.ts           # Pyodide 生命周期管理
│   ├── useCodeExecutor.ts      # Python 代码执行
│   ├── useControllerBridge.ts  # TS ↔ Python controller 桥接
│   ├── useCodeGenerator.ts     # 控制器代码脚手架生成
│   ├── useCodeAnalyzer.ts      # Python 代码静态分析（调用 analyzer.py）
│   ├── useModelLoader.ts       # 模型加载与状态管理
│   ├── useControllerLoader.ts  # 控制器加载
│   ├── useOpenLoopModule.ts    # openloop Python 模块注入
│   ├── useUserParams.ts        # 用户参数（ol.parameter）同步
│   ├── usePackageCache.ts      # Pyodide WASM 包 IndexedDB 缓存
│   ├── useLayout.ts            # 面板布局管理
│   └── useTheme.ts             # 主题（色相/深浅色）管理
│
├── models/                  # 注册表（模型 & 控制器元数据）
│   ├── model-table.ts       # 被控模型注册表
│   ├── controller-table.ts  # 控制器族注册表
│   └── tags.ts              # 系统标签 & 匹配结果类型
│
├── simulation/              # 仿真引擎（纯 TypeScript，无 Vue 依赖）
│   ├── types.ts             # SystemModel / ODESolver 接口
│   ├── solver-stats.ts      # 求解器统计包装器
│   ├── solvers/
│   │   ├── rk4.ts           # 四阶 Runge-Kutta
│   │   └── euler.ts         # 前向 Euler
│   └── plants/
│       ├── types.ts         # PlantModel / VariableDef 接口
│       ├── massSpring.ts    # 质量-弹簧-阻尼
│       ├── firstOrder.ts    # 一阶惯性系统
│       ├── invertedPendulum.ts  # 倒立摆
│       └── index.ts         # createPlant 工厂函数
│
├── sandbox/                 # 2D 物理沙盒（PixiJS）
│   ├── types.ts             # SandboxScene / Drawable / RenderContext
│   ├── SandboxRenderer.ts   # 主渲染器
│   ├── camera.ts            # 世界坐标 ↔ 屏幕坐标转换
│   ├── drawRegistry.ts      # 绘图函数注册表
│   ├── theme.ts             # 沙盒主题色
│   ├── primitives/          # 基础绘图基元
│   │   ├── types.ts         # GroundData / BlockData / BallData / ...
│   │   └── draw.ts          # drawGround / drawBlock / drawBall / ...
│   ├── annotations/         # 标注绘图
│   │   ├── types.ts         # VectorData / ScalarLabelData
│   │   └── draw.ts          # drawVector / drawScalarLabel
│   └── scenes/              # 场景定义
│       ├── massSpring.ts    # 弹簧振子场景
│       ├── firstOrder.ts    # 一阶系统场景
│       └── invertedPendulum.ts  # 倒立摆场景
│
├── panels/                  # 面板组件
│   ├── registry.ts          # 面板类型注册表
│   ├── PanelChart.vue       # 时序图表（uPlot）
│   ├── PanelSandbox.vue     # 2D 沙盒
│   ├── PanelEditor.vue      # 代码编辑器
│   ├── PanelOutput.vue      # 输出控制台
│   └── PanelParams.vue      # 参数滑块面板
│
├── python/                  # Python 源码（在 Pyodide 中运行）
│   ├── openloop.py          # openloop 模块（parameter / status）
│   ├── analyzer.py          # AST 静态分析器
│   └── controllers/         # 内置控制器模板
│       ├── pid.py / pd.py / sliding_mode.py / ...
│       └── empty.py         # 空控制器（默认模板）
│
└── themes/                  # Monaco 编辑器主题
    ├── monaco-dark.ts
    └── monaco-light.ts
```

## 贡献新模型

添加一个新模型需要三步（第四步可选）。

### 1. 实现 PlantModel

在 `src/simulation/plants/` 下创建新文件，实现 `PlantModel` 接口：

```typescript
// src/simulation/plants/myModel.ts
import type { PlantModel, VariableDef } from './types'
import { variable } from './types'

export function createMyModel(params?: { a?: number; b?: number }): PlantModel {
  const a = params?.a ?? 1
  const b = params?.b ?? 0.5

  return {
    id: 'my-model',
    name: '我的模型',
    description: '模型描述',
    category: 'linear',  // 或 'nonlinear'

    stateVars: [
      variable('x', 'm', '位置'),
      variable('v', 'm/s', '速度'),
    ],
    inputVars: [
      variable('u', '', '控制输入'),
    ],
    outputVars: [
      variable('y', '', '输出'),
    ],
    intermediateVars: [
      variable('energy', 'J', '动能'),
    ],

    params: { a, b },

    setParam(name, value) {
      if (name === 'a') this.params.a = value
      if (name === 'b') this.params.b = value
    },

    getInitialState() {
      return new Float64Array([1, 0])  // [x0, v0]
    },

    getDefaultInput() {
      return new Float64Array([0])
    },

    // 核心：状态导数 dx/dt = f(t, x, u)
    derivatives(t, state, input) {
      const x = state[0]!
      const v = state[1]!
      const u = input[0]!
      return new Float64Array([
        v,
        -a * v - b * x + u,
      ])
    },

    // 中间变量（调试/可视化用）
    intermediates(t, state, input) {
      return new Float64Array([0.5 * state[1]! ** 2])
    },
  }
}
```

关键约束：
- `derivatives()` 必须是纯函数，不能有副作用
- 状态向量使用 `Float64Array`，不要用普通数组
- `params` 对象的键名要和 `setParam` 一致

### 2. 在 model-table.ts 注册

```typescript
// src/models/model-table.ts
import { createMyModel } from '@/simulation/plants/myModel'
import iconMyModel from '@/assets/icons/models/my-model.svg?raw'

// 在 modelTable 数组中添加：
{
  id: 'my-model',
  name: '我的模型',
  category: 'linear',
  description: '模型描述',
  icon: iconMyModel,
  params: [
    { name: 'a', value: 1, min: 0, max: 10, step: 0.1 },
    { name: 'b', value: 0.5, min: 0, max: 10, step: 0.1 },
  ],
  systemTags: ['linear'],
  ioSpec: {
    stateVars: [
      { name: 'x', unit: 'm', description: '位置' },
      { name: 'v', unit: 'm/s', description: '速度' },
    ],
    outputs: [
      { name: 'u', unit: '', description: '控制输入' },
    ],
  },
  controlObjective: {
    id: 'position-regulation',
    name: '位置调节',
    description: '控制 x 收敛到 0',
    reference: 0,
    derivativeChain: ['x', 'v'],  // 被控量的导数链
    input: 'u',
    inputGainSign: 1,  // 正输入让 x 正向变化
  },
  createPlant: (p) => createMyModel(p as { a?: number; b?: number }),
  createScene: (frame, p) => createMyModelScene(frame, p),  // 可选
}
```

字段说明：
- `systemTags` — 系统标签，用于控制器兼容性匹配。`'linear'` / `'nonlinear'`，可自定义
- `ioSpec` — I/O 元数据，驱动代码生成器自动解包状态变量
- `controlObjective.derivativeChain` — 按阶数排列的被控量导数链。一阶系统 `['x']`，二阶 `['x', 'v']`
- `controlObjective.inputGainSign` — 正控制输入是否让被控量正向变化。倒立摆为 `-1`（正力让摆杆远离目标）

### 3. SVG 图标

在 `src/assets/icons/models/` 下添加一个 SVG 图标文件。保持与其他图标一致的风格和尺寸。

### 4.（可选）实现 2D 沙盒场景

在 `src/sandbox/scenes/` 下创建场景函数：

```typescript
// src/sandbox/scenes/myModel.ts
import type { SandboxFrame, SandboxScene } from '../types'

export function createMyModelScene(frame: SandboxFrame, params?: Record<string, number>): SandboxScene {
  const x = frame.state.x ?? 0

  return {
    id: 'my-model',
    title: '我的模型',
    camera: { center: { x: 0, y: 0.5 }, scale: 140 },
    objects: [
      { id: 'ground', kind: 'ground', data: { y: 0, xMin: -2, xMax: 2 } },
      { id: 'block', kind: 'block', data: { center: { x, y: 0.3 }, size: { x: 0.4, y: 0.4 } } },
    ],
    annotations: [
      // 可选：力/速度向量、标量标签等
    ],
    legend: [
      { id: 'block', label: '质量块', color: 0xd6e2dc },
    ],
  }
}
```

场景中的 `kind` 字段对应 `drawRegistry.ts` 中注册的绘图函数。可用的基元：

| kind | 数据类型 | 说明 |
|------|---------|------|
| `ground` | `GroundData` | 地面（带刻度线） |
| `block` | `BlockData` | 矩形方块 |
| `ball` | `BallData` | 圆球 |
| `spring` | `SpringData` | 弹簧 |
| `link` | `LinkData` | 连杆 |
| `joint` | `JointData` | 铰接点 |
| `tank` | `TankData` | 容器（带液位） |
| `vector` | `VectorData` | 箭头向量（力/速度） |
| `scalarLabel` | `ScalarLabelData` | 标量数值标签 |

如果需要新的基元类型，参见下方"贡献新绘图基元"。

## 贡献新控制器

添加一个新控制器需要两步。

### 1. 编写 Python 模板

在 `src/python/controllers/` 下创建 `.py` 文件：

```python
# src/python/controllers/my_controller.py

def controller(state, t):
    """控制器入口函数。

    Args:
        state: 状态向量（平台自动解包，见下方生成的上下文代码）
        t: 当前仿真时间

    Returns:
        控制输入（标量）
    """
    # 平台会自动在函数体前注入：
    #   x, v = state[0], state[1]    ← 状态解包
    #   ref = 0                       ← 参考值
    #   input_gain_sign = 1           ← 输入增益方向
    #   q = x                         ← 被控量（0 阶）
    #   q_dot = v                     ← 被控量导数（1 阶）
    #   e = ref - q                   ← 误差
    #   e_dot = -q_dot                ← 误差导数

    Kp = ol.parameter('Kp', 10, min=0, max=100)
    Kd = ol.parameter('Kd', 2, min=0, max=20)

    u = Kp * e + Kd * e_dot
    ol.status('control_output', u)  # 可选：暴露到检查器/图表
    return u
```

模板约定：
- 函数名必须是 `controller`
- 参数必须是 `(state, t)`
- 返回值必须是标量（控制输入）
- 使用 `ol.parameter()` 声明可调参数，自动生成滑块
- 使用 `ol.status()` 暴露内部变量到检查器和图表
- 不要自己解包 `state`——代码生成器会在函数体前自动注入解包代码
- 使用 `q`、`q_dot`、`e`、`e_dot` 等别名——代码生成器会自动定义

### 2. 在 controller-table.ts 注册

```typescript
// src/models/controller-table.ts
import myControllerCode from '@/python/controllers/my_controller.py?raw'
import myControllerIcon from '@/assets/icons/controllers/my_controller.svg?raw'

// 在 controllerFamilies 数组中添加：
{
  id: 'my-controller',
  name: '我的控制器',
  category: 'linear',  // 'linear' | 'nonlinear' | 'optimal' | 'robust' | 'adaptive' | 'heuristic'
  description: '控制器描述',
  icon: myControllerIcon,
  variants: [
    {
      id: 'my-controller-v1',
      name: '变种名称',
      description: '变种描述',
      params: [
        { name: 'Kp', value: 10, min: 0, max: 100, step: 0.1 },
        { name: 'Kd', value: 2, min: 0, max: 20, step: 0.1 },
      ],
      minOrder: 2,         // 所需导数链最小阶数
      maxOrder: 2,         // 可选：最大阶数
      requiredSystemTags: [],  // 可选：所需系统标签（如 ['nonlinear']）
      generationMode: 'generic',  // 'generic' | 'model-specific'
      starterCode: myControllerCode,  // generic 模式必填
    },
  ],
}
```

字段说明：
- `minOrder` / `maxOrder` — 控制器需要的导数链阶数。`minOrder: 2` 表示需要 `q` 和 `q_dot`（即模型的 `derivativeChain` 长度 >= 2）
- `requiredSystemTags` — 模型必须包含的系统标签。`['nonlinear']` 表示只适用于非线性模型
- `generationMode` — `'generic'` 表示模板适用于所有兼容模型；`'model-specific'` 表示需要每个模型的专用模板
- `modelTemplates` — `model-specific` 模式下，按模型 id 映射模板代码：`{ 'inverted-pendulum': code }`

**兼容性匹配是自动的。** 平台根据 `minOrder`、`maxOrder`、`requiredSystemTags`、`generationMode` 自动判断控制器与模型的兼容性。不兼容的控制器会在 UI 中被标记为禁用，并显示原因。不需要写任何 `if/else` 判断代码。

## 贡献新绘图基元

在 `src/sandbox/primitives/` 下添加新的绘图函数：

```typescript
// 1. 在 types.ts 中定义数据类型
export interface MyShapeData {
  center: Vec2
  radius: number
  color?: number
}

// 2. 在 draw.ts 中实现绘图函数
export function drawMyShape(g: Graphics, item: Drawable<MyShapeData>, ctx: RenderContext): void {
  const data = item.data
  const center = ctx.worldToScreen(data.center)
  const radius = ctx.worldLength(data.radius)
  g.circle(center.x, center.y, radius)
    .fill({ color: data.color ?? ctx.theme.bodyFill, alpha: 0.8 })
}

// 3. 在 drawRegistry.ts 中注册
import { drawMyShape } from './primitives/draw'
import type { MyShapeData } from './primitives/types'
register<MyShapeData>('myShape', drawMyShape)
```

## 通用贡献

### UI / 面板

- 面板组件放在 `src/panels/`，在 `src/panels/registry.ts` 注册
- 面板布局是树结构（`LayoutNode`），支持水平/垂直分割
- 使用设计 Token（`src/assets/base.css` 的 CSS 变量），不要硬编码颜色

### 仿真引擎

- 求解器实现 `ODESolver` 接口，放在 `src/simulation/solvers/`
- 求解器只操作 `SystemModel` 接口，不关心具体模型

### 代码生成

- 代码生成器（`useCodeGenerator.ts`）基于模型的 `ioSpec` 和 `controlObjective` 自动生成
- 模板中使用 `q`、`q_dot`、`e`、`e_dot` 别名，不要用 `x`、`v`（旧约定）

### 样式

- 使用 UnoCSS 原子化类名
- 颜色使用设计 Token：`bg-primary`、`text-base`、`bg-surface` 等
- 需要透明度时用 `/50` 语法：`bg-primary/50`

## 开发流程

```bash
pnpm install
pnpm dev          # 启动开发服务器
pnpm type-check   # 类型检查
pnpm lint         # lint + 自动修复
pnpm test:run     # 运行测试
```

提交信息使用 conventional commit 格式，中文正文：

```
feat(model): 添加 XXX 被控模型
fix(controller): 修复 XXX 控制器参数范围
refactor(sandbox): 重构 XXX 绘图逻辑
```

## 提交 PR 前检查

- [ ] `pnpm type-check` 通过
- [ ] `pnpm lint` 通过
- [ ] `pnpm test:run` 通过
- [ ] 新增模型/控制器在侧栏中可见且可选
- [ ] 兼容性标记正确（不兼容的控制器应被禁用）
- [ ] 代码生成的脚手架代码正确（状态变量解包、别名定义）

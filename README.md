<p align="center">
  <img src="public/logo.svg" alt="OpenLoop" width="280" />
</p>

<p align="center">
  <strong>交互式控制算法仿真平台</strong><br/>
  选一个模型，挑一个控制器，调几个参数，看它动起来。
</p>

---

## 为什么做这个

学控制理论的时候，总想快速验证一个想法：PID 调到多少 Kp 会超调？滑模控制的边界层厚度怎么影响抖振？LQR 的 Q、R 矩阵调大调小会怎样？

但现实是——

用 MATLAB/Simulink，光装软件就要半小时，打开之后面对一堆 scope、transfer function 模块，注意力全花在搭环境上，等搭好了已经不想调参了。

用 Python 写，倒是灵活，但每次都要自己建模型、写 ODE 求解器、绑绘图、处理状态传递……一个 5 分钟的想法，要写 50 分钟的脚手架代码。

**OpenLoop 想解决的就是这件事：把"想试试"到"看到效果"之间的距离压到最短。**

它没有什么高大上的功能。它做的事情很简单——

- 你选一个被控模型（弹簧振子、倒立摆……）
- 你选一个控制器（PID、滑模、LQR……）
- 平台自动生成一段带完整上下文的 Python 代码
- 你只管写 `controller(state, t)` 这一个函数，调调参数
- 点运行，看曲线，看动画，看效果

没有建模步骤，没有求解器配置，没有绘图代码。**你只需要关心控制逻辑本身。**

## 它能做什么

### 当作控制算法 Gallery

内置 13 种控制器，从经典到现代，从线性到非线性：

| 线性 | 非线性 | 最优 | 鲁棒 / 自适应 | 启发式 |
|------|--------|------|---------------|--------|
| PID | 滑模控制 | LQR | H∞ 鲁棒控制 | 模糊控制 |
| PD | 反步控制 | LQG | MRAC 自适应 | 神经网络 |
| 超前-滞后 | 反馈线性化 | MPC | | |

每种控制器都有现成的 Python 模板，选中即可运行。想看 PID 和滑模控制在同一个模型上的表现差异？切一下就行。

### 建立调参直觉

每个控制器的参数（Kp、Ki、Kd、滑模面斜率、边界层厚度……）都有滑块。拖动滑块，曲线实时变化。超调了？往回调。响应太慢？往前推。不用重新运行，不用改代码，不用等。

这种"拖一下就能看到效果"的交互，是理解参数物理意义最快的方式。

### 快速验证控制想法

想写自己的控制器？编辑器已经准备好了：

```python
def controller(state, t):
    # 平台自动解包状态变量并定义 q, q_dot, e, e_dot 等别名
    Kp = ol.parameter('Kp', 10, min=0, max=100)
    Kd = ol.parameter('Kd', 2, min=0, max=20)
    return Kp * e + Kd * e_dot
```

`ol.parameter()` 声明的参数会自动出现在滑块面板上。`ol.status()` 可以把内部变量发到图表和检查器里。你只管算法逻辑，其他的平台处理。

## 内置模型

| 模型 | 类型 | 说明 |
|------|------|------|
| 质量-弹簧-阻尼 | 线性 | mẍ + cẋ + kx = F，控制理论入门标配 |
| 一阶惯性系统 | 线性 | τẋ + x = K·u，指数响应，最简单的闭环对象 |
| 倒立摆 | 非线性 | 小车-摆杆系统，经典非线性控制问题 |

每个模型携带完整的 I/O 元数据（状态变量名、单位、控制目标、导数链），平台据此自动生成代码和判断控制器兼容性。

## 平台长什么样

打开浏览器，左侧选模型和控制器，中间是代码编辑器和实时图表，右侧是状态检查器。面板可以自由拖拽组合。

仿真引擎用 RK4 求解器，状态向量是 `Float64Array`，Python 只负责控制函数——性能和灵活性的平衡。2D 沙盒用 PixiJS 渲染，弹簧振子的伸缩、倒立摆的摆动都能实时看到。

深色 / 浅色主题、8 种主题色可选。Monaco 编辑器支持 Python 语法高亮和语法错误检测。

## 快速开始

```bash
git clone https://github.com/your-username/OpenLoop.git
cd OpenLoop
pnpm install
pnpm dev
```

浏览器打开 `http://localhost:5173`，侧栏选模型，选控制器，点运行。

### 命令

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 开发服务器 |
| `pnpm build` | 类型检查 + 生产构建 |
| `pnpm type-check` | 仅类型检查 |
| `pnpm lint` | oxlint + eslint |
| `pnpm test` | Vitest watch |
| `pnpm test:run` | Vitest 单次运行 |

## 技术栈

Vue 3 + TypeScript + Vite 8，Pyodide (WASM Python) 负责运行时，PixiJS 做 2D 渲染，uPlot 画时序图，Monaco 做编辑器，splitpanes 做面板布局，UnoCSS 做样式。

## 部署

推送到 `main` 分支自动部署到 GitHub Pages（GitHub Actions 已配置）。

手动部署：

```bash
pnpm build   # 产物在 dist/
```

自定义路径：`BASE_PATH=/my-app/ pnpm build`

## 贡献

欢迎贡献新的被控模型、控制器算法、绘图基元或其他功能。详见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## License

MIT

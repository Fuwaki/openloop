# OpenLoop

交互式控制算法仿真平台。在浏览器中编写 Python + NumPy 代码，实时控制被控模型，观察仿真效果。

## 功能

- **代码编辑器** — Monaco Editor，支持 Python 语法高亮
- **Python 运行时** — Pyodide (WASM)，内置 NumPy，浏览器端直接执行
- **2D 物理沙盒** — PixiJS 渲染，支持弹簧振子等物理场景可视化
- **实时图表** — uPlot 时序数据绘图
- **参数调节** — 滑块式参数面板，实时调整控制器参数
- **动态面板布局** — 可拖拽分割、自由组合的多面板系统
- **被控模型预设** — 弹簧振子、二阶系统、高阶系统、倒立摆等

## 技术栈

- Vue 3 + TypeScript + Vite 8
- UnoCSS (原子化 CSS)
- Pyodide (Python/WASM)
- PixiJS (2D 渲染)
- Monaco Editor (代码编辑)
- splitpanes (可调面板)
- uPlot (时序图表)

## 开发

```bash
pnpm install
pnpm dev
```

## 命令

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 启动开发服务器 |
| `pnpm build` | 类型检查 + 构建生产版本 |
| `pnpm type-check` | 仅类型检查 |
| `pnpm lint` | oxlint + eslint |
| `pnpm format` | prettier 格式化 |
| `pnpm test` | Vitest watch 模式 |
| `pnpm test:run` | Vitest 单次运行 |

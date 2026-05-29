# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `pnpm dev` — 启动 Vite 开发服务器
- `pnpm build` — 类型检查 + 构建生产版本
- `pnpm type-check` — 仅运行 vue-tsc 类型检查
- `pnpm lint` — oxlint + eslint（自动修复）
- `pnpm format` — prettier 格式化
- `pnpm test` — Vitest watch 模式
- `pnpm test:run` — Vitest 单次运行

单个测试文件：`pnpm test:run src/composables/__tests__/usePyodide.test.ts`

## Tech Stack

Vue 3 + Vite 8 + TypeScript 6。包管理器 pnpm。

### 关键依赖
- **UnoCSS** — 原子化 CSS，配置在 `uno.config.ts`，通过 `virtual:uno.css` 引入
- **Pyodide** — 浏览器端 Python/WASM 运行时，允许用户执行带 numpy 的 Python 代码
- **PixiJS** — 2D 渲染引擎
- **splitpanes** — 可拖拽调整大小的面板布局
- **uPlot** — 高性能时序图表

## 架构

### 设计 Token 系统

所有颜色定义在 `src/assets/base.css` 的 CSS 变量中，`uno.config.ts` 的 theme 映射这些变量。需要透明度工具类支持的颜色（如 primary）使用 RGB 三元组格式：

```css
--c-primary: 16 185 129;  /* 空格分隔，不带逗号 */
```

```ts
// uno.config.ts
primary: 'rgb(var(--c-primary))'  // 支持 bg-primary/50 透明度写法
```

不需要透明度的颜色直接用 hex：`--c-text-muted: #888888` → `'var(--c-text-muted)'`

### Pyodide Composable

`src/composables/usePyodide.ts` 封装了 Pyodide 的生命周期：
- `init()` — 加载 WASM 运行时（~7MB），完成后 `isReady` 变为 true
- `runPython(code)` — 同步执行，返回 `{ result, stdout, stderr, error }`
- `runPythonAsync(code)` — 异步版本
- Pyodide 内置 numpy，无需额外安装

注意：测试中 Pyodide 必须 mock（WASM 无法在 Node 运行），见 `src/composables/__tests__/usePyodide.test.ts`

### 面板布局

`src/components/ResizablePanel.vue` 封装 splitpanes，分割线使用设计 token 配色。用 `<Pane>` 插槽定义面板，支持 `size`、`min-size`、`max-size` 属性。

## Path Alias

`@/` 映射到 `src/`，配置在 `tsconfig.app.json`。

## Testing

框架 Vitest，环境 jsdom。测试文件放在 `src/**/__tests__/` 目录。对无法在 Node 运行的依赖（如 Pyodide）使用 `vi.mock()`。

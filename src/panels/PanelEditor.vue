<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'
import CodeEditor, { type EditorDecoration } from '@/components/CodeEditor.vue'
import { useCodeExecutor } from '@/composables/useCodeExecutor'
import { useSimulationState } from '@/composables/useSimulationState'
import { useCodeAnalyzer, type AnalysisResult } from '@/composables/useCodeAnalyzer'
import { useUserParams } from '@/composables/useUserParams'
import type * as monaco from 'monaco-editor'

const { runOnce, isRunning, isPyodideReady, isPyodideLoading } = useCodeExecutor()
const { currentCode, isSimulationRunning, controllerStatusNames } = useSimulationState()
const { analyze } = useCodeAnalyzer()
const { syncUserParams } = useUserParams()

const markers = ref<monaco.editor.IMarkerData[]>([])
const decorations = ref<EditorDecoration[]>([])

let debounceTimer: ReturnType<typeof setTimeout> | null = null
let analysisVersion = 0

onUnmounted(() => {
  if (debounceTimer) clearTimeout(debounceTimer)
})

function onRun() {
  runOnce().catch(() => {})
}

// 用户编辑：debounce 300ms 后分析
function onUpdate(val: string) {
  currentCode.value = val
}

function scheduleAnalysis() {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => runAnalysis(currentCode.value), 300)
}

// currentCode 变化（用户编辑 / 模型切换）→ debounce 分析
watch(currentCode, scheduleAnalysis, { immediate: true })

// Pyodide 就绪后立即分析一次（首次加载时 currentCode 已有值但 Pyodide 还没好）
watch(isPyodideReady, (ready) => {
  if (ready && currentCode.value.trim()) {
    runAnalysis(currentCode.value)
  }
})

async function runAnalysis(code: string) {
  const version = ++analysisVersion

  if (!code.trim()) {
    markers.value = []
    decorations.value = []
    syncUserParams([])
    controllerStatusNames.value = []
    return
  }

  try {
    const result = await analyze(code)
    // 丢弃过时的分析结果
    if (version !== analysisVersion) return

    markers.value = buildMarkers(result)
    decorations.value = buildDecorations(result)
    syncUserParams(result.olCalls)
    controllerStatusNames.value = result.olCalls
      .filter((c) => c.name === 'openloop.status')
      .map((c) => (typeof c.args[0] === 'string' ? c.args[0] : `status_${c.line}`))
  } catch {
    // 分析失败时保留上次结果，不做处理
  }
}

function buildMarkers(result: AnalysisResult): monaco.editor.IMarkerData[] {
  return result.syntaxErrors.map((e) => ({
    severity: 8, // monaco.MarkerSeverity.Error
    message: e.message,
    startLineNumber: e.line,
    startColumn: e.col + 1,
    endLineNumber: e.line,
    endColumn: e.col + 2,
  }))
}

function buildDecorations(result: AnalysisResult): EditorDecoration[] {
  const decs: EditorDecoration[] = []

  if (result.controller.found) {
    decs.push({
      range: { startLine: result.controller.line ?? 1, startCol: 1, endLine: result.controller.line ?? 1, endCol: 1 },
      glyphMarginClassName: 'ol-glyph-controller',
      inlineMessage: `controller(${(result.controller.params ?? []).join(', ')})`,
    })
  }

  for (const call of result.olCalls) {
    const isParam = call.name === 'openloop.parameter'
    const label = isParam
      ? `param: ${call.args.map(String).join(', ')}`
      : `status: ${call.args.map(String).join(', ')}`

    decs.push({
      range: { startLine: call.line, startCol: call.col + 1, endLine: call.line, endCol: call.end_col + 1 },
      className: isParam ? 'ol-hl-parameter' : 'ol-hl-status',
      glyphMarginClassName: isParam ? 'ol-glyph-parameter' : 'ol-glyph-status',
      inlineMessage: label,
    })
  }

  return decs
}
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- 工具栏 -->
    <div class="flex items-center gap-2 px-2 py-1 bg-bgBase border-b border-surfaceHover">
      <button
        class="flex items-center gap-1.5 px-3 py-1 text-xs rounded cursor-pointer transition-colors"
        :class="isRunning ? 'bg-surfaceHover text-textMuted' : 'bg-primary text-bgBase hover:opacity-80'"
        :disabled="isRunning"
        @click="onRun"
      >
        <span v-if="isRunning" class="i-carbon-circle-dash w-3.5 h-3.5 animate-spin" />
        <span v-else class="i-carbon-play-filled w-3.5 h-3.5" />
        {{ isRunning ? '运行中...' : '运行' }}
      </button>
      <span v-if="isPyodideLoading" class="text-textMuted text-xs">Pyodide 加载中...</span>
      <span v-else-if="isPyodideReady" class="text-textMuted text-xs">Pyodide 就绪</span>
    </div>
    <!-- 编辑器 -->
    <div class="flex-1 min-h-0">
      <CodeEditor
        :model-value="currentCode"
        language="python"
        :read-only="isSimulationRunning"
        read-only-message="仿真运行中，请停止仿真以编辑代码"
        :markers="markers"
        :decorations="decorations"
        @update:model-value="onUpdate"
      />
    </div>
  </div>
</template>

<style>
/* Glyph 图标 — 断点区域的小图标 */
.ol-glyph-controller,
.ol-glyph-parameter,
.ol-glyph-status {
  width: 14px !important;
  height: 14px !important;
  margin-left: 4px;
  margin-top: 3px;
}

.ol-glyph-controller {
  width: 0 !important;
  height: 0 !important;
  border-top: 6px solid transparent;
  border-bottom: 6px solid transparent;
  border-left: 10px solid #10b981;
  background: transparent !important;
  margin-left: 6px;
}
.ol-glyph-parameter  { background: #a78bfa; border-radius: 50%; }
.ol-glyph-status     { background: #f59e0b; border-radius: 50%; }

/* 函数调用文字高亮 */
.ol-hl-parameter { background: rgba(167, 139, 250, 0.15); border-radius: 2px; }
.ol-hl-status    { background: rgba(245, 158, 11, 0.15); border-radius: 2px; }

/* 行尾标签 */
.ol-inline-label {
  margin-left: 12px;
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 11px;
  font-family: monospace;
  opacity: 0.85;
}
</style>

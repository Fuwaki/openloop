<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import * as monaco from 'monaco-editor'
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import { OPENLOOP_DARK } from '@/themes/monaco-dark'
import { OPENLOOP_LIGHT } from '@/themes/monaco-light'
import { useTheme } from '@/modules/app'

window.MonacoEnvironment = {
  getWorker: () => new EditorWorker(),
}

const DARK_THEME = 'openloop-dark'
const LIGHT_THEME = 'openloop-light'
monaco.editor.defineTheme(DARK_THEME, OPENLOOP_DARK)
monaco.editor.defineTheme(LIGHT_THEME, OPENLOOP_LIGHT)

const { isDark } = useTheme()

export interface EditorDecoration {
  range: { startLine: number; startCol: number; endLine: number; endCol: number }
  className?: string
  glyphMarginClassName?: string
  inlineMessage?: string
}

const props = withDefaults(defineProps<{
  language?: string
  modelValue?: string
  readOnly?: boolean
  readOnlyMessage?: string
  markers?: monaco.editor.IMarkerData[]
  decorations?: EditorDecoration[]
}>(), {
  language: 'python',
  modelValue: '',
  readOnly: false,
  readOnlyMessage: 'Cannot edit in read-only editor',
  markers: () => [],
  decorations: () => [],
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const containerRef = ref<HTMLElement>()
let editor: monaco.editor.IStandaloneCodeEditor | null = null
let decoCollection: monaco.editor.IEditorDecorationsCollection | null = null

const MARKER_OWNER = 'openloop'

function getModel(): monaco.editor.ITextModel | null {
  return editor?.getModel() ?? null
}

function toMonacoDecos(decs: EditorDecoration[]): monaco.editor.IModelDeltaDecoration[] {
  return decs.map((d) => ({
    range: new monaco.Range(
      d.range.startLine,
      d.range.startCol,
      d.range.endLine,
      d.range.endCol,
    ),
    options: {
      className: d.className,
      glyphMarginClassName: d.glyphMarginClassName,
      glyphMargin: { position: 1 },
      after: d.inlineMessage
        ? { content: ` ${d.inlineMessage} `, inlineClassName: 'ol-inline-label' }
        : undefined,
      stickiness: 1, // NeverGrowsWhenTypingAtEdges
    },
  }))
}

// Markers: 语法错误波浪线
watch(() => props.markers, (markers) => {
  const model = getModel()
  if (!model) return
  monaco.editor.setModelMarkers(model, MARKER_OWNER, markers)
}, { deep: true })

// Decorations: glyph 图标 + 行尾标签
watch(() => props.decorations, (decs) => {
  if (!editor) return
  decoCollection?.clear()
  if (decs.length === 0) return
  decoCollection = editor.createDecorationsCollection(toMonacoDecos(decs))
}, { deep: true })

onMounted(() => {
  if (!containerRef.value) return

  editor = monaco.editor.create(containerRef.value, {
    value: props.modelValue,
    language: props.language,
    theme: isDark.value ? DARK_THEME : LIGHT_THEME,
    readOnly: props.readOnly,
    readOnlyMessage: { value: props.readOnlyMessage },
    automaticLayout: true,
    minimap: { enabled: false },
    fontSize: 14,
    lineNumbers: 'on',
    glyphMargin: true,
    scrollBeyondLastLine: false,
    padding: { top: 8, bottom: 8 },
    tabSize: 4,
  })

  editor.onDidChangeModelContent(() => {
    emit('update:modelValue', editor!.getValue())
  })

  // 初始化已有的 markers
  if (props.markers.length > 0) {
    const model = editor.getModel()!
    monaco.editor.setModelMarkers(model, MARKER_OWNER, props.markers)
  }
  // 初始化已有的 decorations
  if (props.decorations.length > 0) {
    decoCollection = editor.createDecorationsCollection(toMonacoDecos(props.decorations))
  }
})

watch(() => props.modelValue, (val) => {
  if (editor && editor.getValue() !== val) {
    editor.setValue(val)
  }
})

watch(() => props.language, (lang) => {
  if (editor) {
    monaco.editor.setModelLanguage(editor.getModel()!, lang)
  }
})

watch(() => props.readOnly, (val) => {
  editor?.updateOptions({
    readOnly: val,
    readOnlyMessage: { value: props.readOnlyMessage },
  })
})

watch(isDark, (dark) => {
  monaco.editor.setTheme(dark ? DARK_THEME : LIGHT_THEME)
})

onBeforeUnmount(() => {
  decoCollection?.clear()
  editor?.dispose()
})
</script>

<template>
  <div ref="containerRef" class="h-full w-full bg-bgBase" />
</template>

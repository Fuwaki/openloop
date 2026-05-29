<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import * as monaco from 'monaco-editor'
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import { OPENLOOP_DARK } from '@/themes/monaco-dark'

window.MonacoEnvironment = {
  getWorker: () => new EditorWorker(),
}

const THEME_NAME = 'openloop-dark'
monaco.editor.defineTheme(THEME_NAME, OPENLOOP_DARK)

const props = withDefaults(defineProps<{
  language?: string
  modelValue?: string
  readOnly?: boolean
  readOnlyMessage?: string
}>(), {
  language: 'python',
  modelValue: '',
  readOnly: false,
  readOnlyMessage: 'Cannot edit in read-only editor',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const containerRef = ref<HTMLElement>()
let editor: monaco.editor.IStandaloneCodeEditor | null = null

onMounted(() => {
  if (!containerRef.value) return

  editor = monaco.editor.create(containerRef.value, {
    value: props.modelValue,
    language: props.language,
    theme: THEME_NAME,
    readOnly: props.readOnly,
    readOnlyMessage: { value: props.readOnlyMessage },
    automaticLayout: true,
    minimap: { enabled: false },
    fontSize: 14,
    lineNumbers: 'on',
    scrollBeyondLastLine: false,
    padding: { top: 8, bottom: 8 },
    tabSize: 4,
  })

  editor.onDidChangeModelContent(() => {
    emit('update:modelValue', editor!.getValue())
  })
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

onBeforeUnmount(() => {
  editor?.dispose()
})
</script>

<template>
  <div ref="containerRef" class="h-full w-full bg-bgBase" />
</template>

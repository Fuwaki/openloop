<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { generateControllerCode } from '@/composables/useCodeGenerator'
import { isSimulationRunning } from '@/composables/useSimulationState'
import {
  matchControllerVariant,
  type ControllerFamily,
  type ControllerVariant,
} from '@/models/controller-table'
import type { ModelEntry } from '@/models/model-table'

const props = defineProps<{
  family: ControllerFamily
  model: ModelEntry | null
}>()

const emit = defineEmits<{
  close: []
  select: [variantId: string]
}>()

const confirming = ref(false)
const selectedVariantId = ref('')

const variantMatches = computed(() => new Map(
  props.family.variants.map((variant) => [
    variant.id,
    props.model ? matchControllerVariant(props.model, variant) : { compatible: true },
  ]),
))

const firstCompatibleVariant = computed(() =>
  props.family.variants.find((variant) => variantMatches.value.get(variant.id)?.compatible),
)

watch(
  () => props.family,
  () => {
    selectedVariantId.value = firstCompatibleVariant.value?.id ?? props.family.variants[0]?.id ?? ''
    confirming.value = false
  },
  { immediate: true },
)

watch(firstCompatibleVariant, (variant) => {
  if (!variant) return
  const current = variantMatches.value.get(selectedVariantId.value)
  if (!current?.compatible) selectedVariantId.value = variant.id
})

const selectedVariant = computed<ControllerVariant | null>(() =>
  props.family.variants.find((variant) => variant.id === selectedVariantId.value) ?? null,
)

const selectedMatch = computed(() =>
  selectedVariant.value ? variantMatches.value.get(selectedVariant.value.id) : undefined,
)

const canSelect = computed(() => Boolean(selectedVariant.value && selectedMatch.value?.compatible))

const code = computed(() => {
  const variant = selectedVariant.value
  if (!variant) return ''
  if (!props.model) return variant.starterCode ?? '# 请选择模型后预览生成代码\n'
  const match = variantMatches.value.get(variant.id)
  if (!match?.compatible) return `# 当前变种不可用于该模型: ${match?.reason ?? '不兼容'}\n`
  try {
    return generateControllerCode(props.model, variant)
  } catch (e) {
    return `# 生成失败: ${e instanceof Error ? e.message : String(e)}\n`
  }
})

function onSelectVariant(variant: ControllerVariant) {
  selectedVariantId.value = variant.id
  confirming.value = false
}

function onUse() {
  if (!canSelect.value || !selectedVariant.value) return
  if (!confirming.value) {
    confirming.value = true
    return
  }
  emit('select', selectedVariant.value.id)
}
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center" @click.self="emit('close')">
      <div class="absolute inset-0 bg-black/40" @click="emit('close')" />

      <div class="relative w-[64rem] max-w-[92vw] h-[36rem] max-h-[84vh] bg-surface rounded-xl border border-surfaceHover shadow-2xl flex overflow-hidden">
        <div class="w-80 shrink-0 flex flex-col border-r border-surfaceHover bg-bgBase">
          <div class="p-5 border-b border-surfaceHover">
            <div class="flex items-center gap-2.5">
              <span class="w-5 h-5 text-primary [&>svg]:w-full [&>svg]:h-full" v-html="family.icon" />
              <h2 class="text-textBase text-base font-bold">{{ family.name }}</h2>
            </div>
            <p class="text-textMuted text-xs mt-2 leading-relaxed">{{ family.description }}</p>
            <div v-if="model" class="mt-3 rounded-lg bg-surface px-3 py-2">
              <p class="text-textMuted text-[11px]">当前目标</p>
              <p class="text-textBase text-xs mt-0.5">{{ model.controlObjective.name }}</p>
              <p class="text-textMuted text-[11px] mt-0.5">{{ model.controlObjective.derivativeChain.join(' -> ') }}</p>
            </div>
          </div>

          <div class="flex-1 overflow-y-auto p-4 space-y-2">
            <button
              v-for="variant in family.variants"
              :key="variant.id"
              class="w-full text-left rounded-lg border p-3 transition-colors"
              :class="[
                selectedVariantId === variant.id ? 'border-primary bg-primary/10' : 'border-surfaceHover bg-surface hover:border-primary/50',
                !variantMatches.get(variant.id)?.compatible ? 'opacity-55' : '',
              ]"
              @click="onSelectVariant(variant)"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="text-textBase text-sm font-medium">{{ variant.name }}</p>
                  <p class="text-textMuted text-xs mt-1 leading-relaxed">{{ variant.description }}</p>
                </div>
                <span
                  class="shrink-0 text-[10px] px-1.5 py-0.5 rounded"
                  :class="variantMatches.get(variant.id)?.compatible ? 'text-primary bg-primary/10' : 'text-warning bg-warning/10'"
                >
                  {{ variantMatches.get(variant.id)?.compatible ? '可用' : '禁用' }}
                </span>
              </div>
              <p v-if="!variantMatches.get(variant.id)?.compatible" class="text-warning text-[11px] mt-2">
                {{ variantMatches.get(variant.id)?.reason }}
              </p>
              <div v-if="variant.params.length > 0" class="flex flex-wrap gap-1.5 mt-2">
                <span
                  v-for="p in variant.params"
                  :key="p.name"
                  class="text-primary/70 text-[11px] bg-primary/10 px-2 py-0.5 rounded font-mono"
                >{{ p.name }}={{ p.value }}</span>
              </div>
            </button>
          </div>

          <div class="p-4 border-t border-surfaceHover space-y-2">
            <p v-if="confirming" class="text-warning text-[11px] text-center leading-relaxed">
              {{ isSimulationRunning ? '将替换代码并重启仿真' : '将替换编辑器中的代码' }}
            </p>
            <button
              class="w-full py-2 text-sm font-medium rounded-lg transition-colors"
              :class="canSelect ? confirming ? 'bg-warning text-white hover:bg-warning/90 cursor-pointer' : 'bg-primary text-white hover:bg-primary/90 cursor-pointer' : 'bg-surfaceHover text-textMuted cursor-not-allowed'"
              :disabled="!canSelect"
              @click="onUse"
            >
              {{ canSelect ? confirming ? isSimulationRunning ? '替换代码并重启仿真' : '替换代码' : '使用此变种' : '当前变种不可用' }}
            </button>
          </div>
        </div>

        <div class="flex-1 flex flex-col min-w-0">
          <div class="h-10 flex items-center justify-between px-4 border-b border-surfaceHover shrink-0">
            <span class="text-textMuted text-xs font-medium">
              {{ selectedVariant ? `${selectedVariant.name} / 生成预览` : '生成预览' }}
            </span>
            <button class="text-textMuted hover:text-textBase cursor-pointer" @click="emit('close')">
              <span class="i-carbon-close w-4 h-4" />
            </button>
          </div>
          <pre class="flex-1 overflow-auto p-4 text-xs leading-relaxed font-mono text-textBase bg-bgBase whitespace-pre">{{ code }}</pre>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { useModelLoader } from '@/composables/useModelLoader'
import { useUserParams } from '@/composables/useUserParams'
import { updateParamValues } from '@/composables/useOpenLoopModule'

export interface Param {
  name: string
  value: number
  min: number
  max: number
  step?: number
}

const props = withDefaults(defineProps<{
  params?: Param[]
}>(), {
  params: () => [
    { name: 'Kp', value: 1, min: 0, max: 10, step: 0.1 },
    { name: 'Ki', value: 0, min: 0, max: 5, step: 0.01 },
    { name: 'Kd', value: 0, min: 0, max: 5, step: 0.01 },
  ],
})

const emit = defineEmits<{
  'update:params': [params: Param[]]
}>()

const localParams = ref(props.params.map((p) => ({ ...p })))
const expandedIndex = ref<number | null>(null)
const editingIndex = ref<number | null>(null)
const editValue = ref('')
const valueInputRef = ref<HTMLInputElement | null>(null)
function setValueInputRef(el: unknown, index: number) {
  if (editingIndex.value === index && el instanceof HTMLInputElement) {
    valueInputRef.value = el
  }
}
const { currentParams, currentPlant } = useModelLoader()
const { userParams } = useUserParams()

watch(currentParams, (val) => {
  localParams.value = val.map((p) => ({ ...p }))
}, { deep: true, immediate: true })

watch(() => props.params, (val) => {
  if (currentParams.value.length > 0) return
  localParams.value = val.map((p) => ({ ...p }))
}, { deep: true })

function emitUpdate() {
  const nextParams = localParams.value.map((p) => ({ ...p, step: p.step ?? 0.01 }))
  currentParams.value = nextParams
  for (const param of nextParams) currentPlant.value?.setParam(param.name, param.value)
  emit('update:params', nextParams)
}

function onSliderInput(p: Param, e: Event) {
  p.value = Number((e.target as HTMLInputElement).value)
  emitUpdate()
}

function toggleExpand(index: number) {
  expandedIndex.value = expandedIndex.value === index ? null : index
}

function startEdit(index: number) {
  editingIndex.value = index
  editValue.value = String(localParams.value[index]?.value ?? 0)
  nextTick(() => valueInputRef.value?.select())
}

function confirmEdit(p: Param) {
  const v = Number(editValue.value)
  if (!Number.isNaN(v)) {
    p.value = Math.min(p.max, Math.max(p.min, v))
    emitUpdate()
  }
  editingIndex.value = null
}

function onEditKeydown(p: Param, e: KeyboardEvent) {
  if (e.key === 'Enter') confirmEdit(p)
  if (e.key === 'Escape') editingIndex.value = null
}

function onConfigInput(p: Param, field: 'min' | 'max' | 'step', e: Event) {
  const v = Number((e.target as HTMLInputElement).value)
  if (Number.isNaN(v)) return
  if (field === 'step' && v <= 0) return
  p[field] = v
  if (field === 'min') {
    if (v > p.max) p.max = v
    p.value = Math.max(p.value, v)
  }
  if (field === 'max') {
    if (v < p.min) p.min = v
    p.value = Math.min(p.value, v)
  }
  emitUpdate()
}

function removeParam(index: number) {
  localParams.value.splice(index, 1)
  if (expandedIndex.value === index) expandedIndex.value = null
  else if (expandedIndex.value !== null && expandedIndex.value > index) expandedIndex.value--
  emitUpdate()
}

function onUserParamInput(p: { name: string; value: number }, e: Event) {
  p.value = Number((e.target as HTMLInputElement).value)
  updateParamValues({ [p.name]: p.value })
}

function sliderPercent(p: { value: number; min: number; max: number }): number {
  if (p.max <= p.min) return 50
  return Math.max(0, Math.min(100, ((p.value - p.min) / (p.max - p.min)) * 100))
}

function formatValue(v: number, step = 0.01): string {
  if (!Number.isFinite(v)) return String(v)
  const s = String(step)
  // 整数 step 或科学计数法时，用 toPrecision 兜底
  if (!s.includes('.') || s.includes('e')) {
    return Number.isInteger(step) ? v.toFixed(0) : v.toPrecision(4)
  }
  const decimals = s.split('.')[1]?.length ?? 2
  return v.toFixed(decimals)
}
</script>

<template>
  <div class="flex flex-col h-full overflow-hidden">
    <div class="flex-1 overflow-y-auto p-2 space-y-1">
      <div
        v-for="(p, i) in localParams"
        :key="i"
        class="group rounded-lg bg-surface hover:bg-surfaceHover transition-colors"
      >
        <!-- Main row -->
        <div class="flex items-center gap-2 px-3 py-2">
          <!-- Name -->
          <span class="text-textBase text-sm font-mono w-10 shrink-0 truncate">{{ p.name }}</span>

          <!-- Slider -->
          <div class="flex-1 relative flex items-center h-5">
            <div class="absolute inset-x-0 h-1 rounded-full bg-surfaceHover">
              <div
                class="absolute h-full rounded-full bg-primary/60"
                :style="{ width: sliderPercent(p) + '%' }"
              />
            </div>
            <input
              type="range"
              :value="p.value"
              :min="p.min"
              :max="p.max"
              :step="p.step ?? 0.01"
              class="absolute inset-x-0 w-full h-5 opacity-0 cursor-pointer"
              @input="onSliderInput(p, $event)"
            />
            <!-- Thumb indicator -->
            <div
              class="absolute w-3 h-3 rounded-full bg-primary shadow-sm pointer-events-none transition-transform group-hover:scale-110"
              :style="{ left: `calc(${sliderPercent(p)}% - 6px)` }"
            />
          </div>

          <!-- Value (click to edit) -->
          <div
            v-if="editingIndex !== i"
            class="w-16 text-right text-xs font-mono text-textBase bg-bgBase rounded px-1.5 py-0.5 cursor-text hover:bg-surfaceHover transition-colors select-none"
            @click="startEdit(i)"
          >
            {{ formatValue(p.value, p.step ?? 0.01) }}
          </div>
          <input
            v-else
            :ref="(el: unknown) => setValueInputRef(el, i)"
            type="number"
            v-model="editValue"
            :step="p.step ?? 0.01"
            class="w-16 text-right text-xs font-mono text-textBase bg-bgBase rounded px-1.5 py-0.5 outline-none border border-primary"
            @blur="confirmEdit(p)"
            @keydown="onEditKeydown(p, $event)"
          />

          <!-- Settings toggle -->
          <button
            class="w-5 h-5 flex items-center justify-center rounded text-textMuted hover:text-textBase hover:bg-surfaceHover transition-colors opacity-0 group-hover:opacity-100"
            :class="{ '!opacity-100 text-primary': expandedIndex === i }"
            @click="toggleExpand(i)"
          >
            <svg class="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M6.5 2.5h3l.5 1.5 1.2.7 1.5-.5 1.5 1.5-.5 1.5.7 1.2 1.5.5v3l-1.5.5-.7 1.2.5 1.5-1.5 1.5-1.5-.5-1.2.7-.5 1.5h-3l-.5-1.5-1.2-.7-1.5.5-1.5-1.5.5-1.5-.7-1.2L2 9.5v-3l1.5-.5.7-1.2-.5-1.5L5.2 2l1.5.5.7-1.2z" />
              <circle cx="8" cy="8" r="2" />
            </svg>
          </button>
        </div>

        <!-- Expanded config -->
        <div
          v-if="expandedIndex === i"
          class="px-3 pb-2.5 pt-0.5 space-y-2 border-t border-surfaceHover"
        >
          <div class="grid grid-cols-3 gap-2">
            <label class="flex flex-col gap-0.5">
              <span class="text-[10px] text-textMuted uppercase tracking-wider">Min</span>
              <input
                type="number"
                :value="p.min"
                :step="p.step ?? 0.01"
                class="bg-bgBase text-textBase text-xs text-center px-1.5 py-1 rounded border border-surfaceHover focus:border-primary outline-none"
                @input="onConfigInput(p, 'min', $event)"
              />
            </label>
            <label class="flex flex-col gap-0.5">
              <span class="text-[10px] text-textMuted uppercase tracking-wider">Max</span>
              <input
                type="number"
                :value="p.max"
                :step="p.step ?? 0.01"
                class="bg-bgBase text-textBase text-xs text-center px-1.5 py-1 rounded border border-surfaceHover focus:border-primary outline-none"
                @input="onConfigInput(p, 'max', $event)"
              />
            </label>
            <label class="flex flex-col gap-0.5">
              <span class="text-[10px] text-textMuted uppercase tracking-wider">Step</span>
              <input
                type="number"
                :value="p.step ?? 0.01"
                min="0.001"
                step="0.001"
                class="bg-bgBase text-textBase text-xs text-center px-1.5 py-1 rounded border border-surfaceHover focus:border-primary outline-none"
                @input="onConfigInput(p, 'step', $event)"
              />
            </label>
          </div>

          <!-- Name edit + delete -->
          <div class="flex items-center gap-2">
            <label class="flex-1 flex items-center gap-1.5">
              <span class="text-[10px] text-textMuted uppercase tracking-wider shrink-0">Name</span>
              <input
                type="text"
                v-model="p.name"
                maxlength="8"
                class="flex-1 bg-bgBase text-textBase text-xs font-mono px-1.5 py-1 rounded border border-surfaceHover focus:border-primary outline-none"
                @change="emitUpdate()"
              />
            </label>
            <button
              class="w-6 h-6 flex items-center justify-center rounded text-textMuted hover:text-error hover:bg-error/10 transition-colors"
              @click="removeParam(i)"
            >
              <svg class="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M3 4h10M6 4V3h4v1M5 4v8h6V4" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 用户参数（ol.parameter） -->
    <div v-if="userParams.length > 0" class="border-t border-surfaceHover">
      <div class="px-3 py-1.5 text-[10px] text-textMuted uppercase tracking-wider">用户参数</div>
      <div class="flex-1 overflow-y-auto p-2 space-y-1">
        <div
          v-for="(p, i) in userParams"
          :key="p.name"
          class="group rounded-lg bg-surface hover:bg-surfaceHover transition-colors"
        >
          <div class="flex items-center gap-2 px-3 py-2">
            <span class="text-textBase text-sm font-mono w-16 shrink-0 truncate" :title="p.name">{{ p.name }}</span>
            <div class="flex-1 relative flex items-center h-5">
              <div class="absolute inset-x-0 h-1 rounded-full bg-surfaceHover">
                <div
                  class="absolute h-full rounded-full bg-primary/60"
                  :style="{ width: sliderPercent(p) + '%' }"
                />
              </div>
              <input
                type="range"
                :value="p.value"
                :min="p.min"
                :max="p.max"
                :step="p.step"
                class="absolute inset-x-0 w-full h-5 opacity-0 cursor-pointer"
                @input="onUserParamInput(p, $event)"
              />
              <div
                class="absolute w-3 h-3 rounded-full bg-primary shadow-sm pointer-events-none transition-transform group-hover:scale-110"
                :style="{ left: `calc(${sliderPercent(p)}% - 6px)` }"
              />
            </div>
            <span class="w-16 text-right text-xs font-mono text-textMuted">
              {{ formatValue(p.value, p.step) }}
            </span>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

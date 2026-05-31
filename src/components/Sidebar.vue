<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useSimulationRunner, useSimulationState, useControllerLoader } from '@/modules/simulation'
import { useToast } from '@/modules/app'
import { useModelLoader, matchControllerFamily } from '@/modules/models'
import type { ModelEntry, ControllerCategory, ControllerFamily } from '@/modules/models'
import AppLogo from './AppLogo.vue'
import ControllerPopup from './ControllerPopup.vue'

const emit = defineEmits<{
  openSettings: []
}>()

const { outputHistory, clearOutput } = useSimulationState()
const { currentEntry, loadModel, getModelsByCategory } = useModelLoader()
const { currentController, loadController, getControllersByCategory } = useControllerLoader()
const runner = useSimulationRunner()
const { toast } = useToast()

// 仿真启动失败时显示错误
watch(() => runner.error.value, (err) => {
  if (err) toast(err, 'error')
})

// ── 模型面板 ──
const expanded = ref(false)
const activeCategory = ref<ModelEntry['category']>('linear')

const showModelHint = ref(false)
const showControllerHint = ref(false)
const modelHintPos = ref({ x: 0, y: 0 })
const controllerHintPos = ref({ x: 0, y: 0 })
const modelHintHover = ref(false)
const controllerHintHover = ref(false)

function showModelTooltip(e: MouseEvent) {
  const r = (e.target as HTMLElement).getBoundingClientRect()
  modelHintPos.value = { x: r.left, y: r.bottom + 4 }
  showModelHint.value = true
}

function hideModelTooltip() {
  setTimeout(() => { if (!modelHintHover.value) showModelHint.value = false }, 100)
}

function showControllerTooltip(e: MouseEvent) {
  const r = (e.target as HTMLElement).getBoundingClientRect()
  controllerHintPos.value = { x: r.left, y: r.bottom + 4 }
  showControllerHint.value = true
}

function hideControllerTooltip() {
  setTimeout(() => { if (!controllerHintHover.value) showControllerHint.value = false }, 100)
}

const categories = [
  { id: 'linear' as const, label: '线性系统' },
  { id: 'nonlinear' as const, label: '非线性系统' },
]

const models = computed(() => getModelsByCategory(activeCategory.value))

function selectModel(m: ModelEntry) {
  void loadModel(m.id)
  expanded.value = false
}

// ── 控制器面板 ──
const controllerExpanded = ref(false)
const activeControllerCategory = ref<ControllerCategory>('linear')

const controllerCategories = [
  { id: 'linear' as const, label: '线性' },
  { id: 'nonlinear' as const, label: '非线性' },
  { id: 'optimal' as const, label: '最优' },
  { id: 'robust' as const, label: '鲁棒' },
  { id: 'adaptive' as const, label: '自适应' },
  { id: 'heuristic' as const, label: '启发式' },
]

const controllers = computed(() => {
  const model = currentEntry.value
  return getControllersByCategory(activeControllerCategory.value).map((c) => {
    const match = matchControllerFamily(model, c)
    return { ...c, compatible: match.compatible, reason: match.reason }
  })
})

// ── 控制器弹窗 ──
const popupController = ref<ControllerFamily | null>(null)

function openControllerPopup(c: ControllerFamily) {
  popupController.value = c
}

function confirmController(variantId: string) {
  if (!popupController.value) return
  loadController(popupController.value.id, variantId)
  popupController.value = null
  controllerExpanded.value = false
}


function exportOutput() {
  const lines = outputHistory.value.map((e) => {
    const tag = e.type === 'stdout' ? '' : `[${e.type}] `
    return `${tag}${e.text}`
  })
  const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `openloop-export-${Date.now()}.txt`
  a.click()
  URL.revokeObjectURL(a.href)
}
</script>

<template>
  <div
    class="h-full bg-surface border-r border-surfaceHover shrink-0 flex transition-all duration-200 overflow-hidden"
    :class="(expanded || controllerExpanded) ? 'w-96' : 'w-16'"
  >
    <!-- 图标栏 -->
    <div class="w-16 h-full flex flex-col items-center shrink-0">
      <div class="w-full h-14 flex items-center justify-center relative group">
        <AppLogo :size="28" />
        <span
          v-if="!expanded"
          class="absolute left-full ml-2 px-2 py-1 bg-bgBase text-textBase text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 border border-surfaceHover"
        >OpenLoop</span>
      </div>

      <div class="w-8 border-t border-surfaceHover my-1" />

      <!-- 模型 -->
      <button
        class="w-full h-12 flex items-center justify-center transition-colors relative group cursor-pointer"
        :class="expanded ? 'text-primary bg-primary/10' : 'text-textMuted hover:text-textBase hover:bg-surfaceHover'"
        @click="expanded = !expanded; controllerExpanded = false"
      >
        <span class="i-carbon-model-alt w-5 h-5" />
        <span
          v-if="!expanded"
          class="absolute left-full ml-2 px-2 py-1 bg-bgBase text-textBase text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 border border-surfaceHover"
        >模型{{ currentEntry ? `: ${currentEntry.name}` : '' }}</span>
      </button>

      <!-- 控制器 -->
      <button
        class="w-full h-12 flex items-center justify-center transition-colors relative group cursor-pointer"
        :class="controllerExpanded ? 'text-primary bg-primary/10' : 'text-textMuted hover:text-textBase hover:bg-surfaceHover'"
        @click="controllerExpanded = !controllerExpanded; expanded = false"
      >
        <span class="i-carbon-script w-5 h-5" />
        <span
          v-if="!controllerExpanded"
          class="absolute left-full ml-2 px-2 py-1 bg-bgBase text-textBase text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 border border-surfaceHover"
        >控制器{{ currentController ? `: ${currentController.family.name}` : '' }}</span>
      </button>

      <div class="w-8 border-t border-surfaceHover my-1" />

      <!-- 运行/暂停/停止 -->
      <template v-if="runner.isRunning.value">
        <!-- 暂停/继续 -->
        <button
          class="w-full h-12 flex items-center justify-center transition-colors relative group cursor-pointer"
          :class="runner.isPaused.value ? 'text-primary hover:bg-primary/10' : 'text-warning hover:bg-warning/10'"
          @click="runner.isPaused.value ? runner.resume() : runner.pause()"
        >
          <span :class="runner.isPaused.value ? 'i-carbon-play-filled' : 'i-carbon-pause-filled'" class="w-5 h-5" />
          <span
            v-if="!expanded"
            class="absolute left-full ml-2 px-2 py-1 bg-bgBase text-textBase text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 border border-surfaceHover"
          >{{ runner.isPaused.value ? '继续' : '暂停' }}</span>
        </button>
        <!-- 停止 -->
        <button
          class="w-full h-12 flex items-center justify-center text-error hover:bg-error/10 transition-colors relative group cursor-pointer"
          @click="runner.stop()"
        >
          <span class="i-carbon-stop-filled w-5 h-5" />
          <span
            v-if="!expanded"
            class="absolute left-full ml-2 px-2 py-1 bg-bgBase text-textBase text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 border border-surfaceHover"
          >停止</span>
        </button>
      </template>
      <button
        v-else
        class="w-full h-12 flex items-center justify-center text-primary hover:bg-primary/10 transition-colors relative group cursor-pointer"
        @click="runner.start()"
      >
        <span class="i-carbon-play-filled w-5 h-5" />
        <span
          v-if="!expanded"
          class="absolute left-full ml-2 px-2 py-1 bg-bgBase text-textBase text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 border border-surfaceHover"
        >运行仿真</span>
      </button>

      <!-- 导出 -->
      <button
        class="w-full h-12 flex items-center justify-center text-textMuted hover:text-textBase hover:bg-surfaceHover transition-colors relative group cursor-pointer"
        @click="exportOutput"
      >
        <span class="i-carbon-export w-5 h-5" />
        <span
          v-if="!expanded"
          class="absolute left-full ml-2 px-2 py-1 bg-bgBase text-textBase text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 border border-surfaceHover"
        >导出</span>
      </button>

      <!-- 清空 -->
      <button
        class="w-full h-12 flex items-center justify-center text-textMuted hover:text-textBase hover:bg-surfaceHover transition-colors relative group cursor-pointer"
        @click="clearOutput"
      >
        <span class="i-carbon-trash-can w-5 h-5" />
        <span
          v-if="!expanded"
          class="absolute left-full ml-2 px-2 py-1 bg-bgBase text-textBase text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 border border-surfaceHover"
        >清空</span>
      </button>

      <div class="flex-1" />

      <!-- 设置 -->
      <button
        class="w-full h-12 flex items-center justify-center text-textMuted hover:text-textBase hover:bg-surfaceHover transition-colors relative group cursor-pointer"
        @click="emit('openSettings')"
      >
        <span class="i-carbon-settings w-5 h-5" />
        <span
          v-if="!expanded"
          class="absolute left-full ml-2 px-2 py-1 bg-bgBase text-textBase text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 border border-surfaceHover"
        >设置</span>
      </button>
    </div>

    <!-- 展开区：模型列表 -->
    <Transition name="panel">
      <div v-if="expanded" class="flex-1 flex flex-col min-w-0 border-l border-surfaceHover">
        <div class="h-14 flex items-center justify-between px-5 border-b border-surfaceHover shrink-0">
          <span class="text-textBase text-sm font-bold">被控模型</span>
          <div class="flex items-center gap-2">
            <span
              class="i-carbon-help w-4 h-4 text-textMuted cursor-help"
              @mouseenter="showModelTooltip"
              @mouseleave="hideModelTooltip"
            />
            <Teleport to="body">
              <div
                v-if="showModelHint"
                class="fixed w-56 p-3 bg-bgBase border border-surfaceHover rounded-lg shadow-lg text-xs text-textMuted leading-relaxed z-50"
                :style="{ left: modelHintPos.x + 'px', top: modelHintPos.y + 'px' }"
                @mouseenter="modelHintHover = true"
                @mouseleave="modelHintHover = false; showModelHint = false"
              >
                没有找到想要的模型？欢迎提交 PR 扩充模型库！<br>
                <a href="https://github.com/Fuwaki/openloop" target="_blank" class="text-primary hover:underline">github.com/Fuwaki/openloop</a>
              </div>
            </Teleport>
            <button class="text-textMuted hover:text-textBase cursor-pointer" @click="expanded = false">
              <span class="i-carbon-close w-4 h-4" />
            </button>
          </div>
        </div>
        <div class="flex border-b border-surfaceHover shrink-0">
          <button
            v-for="cat in categories"
            :key="cat.id"
            class="flex-1 py-2.5 text-sm transition-colors cursor-pointer"
            :class="activeCategory === cat.id ? 'text-primary border-b-2 border-primary' : 'text-textMuted hover:text-textBase'"
            @click="activeCategory = cat.id"
          >{{ cat.label }}</button>
        </div>
        <div class="flex-1 overflow-y-auto p-3 space-y-2">
          <button
            v-for="m in models"
            :key="m.id"
            class="w-full text-left p-4 rounded-lg transition-colors cursor-pointer"
            :class="currentEntry?.id === m.id ? 'bg-primary/10 border border-primary/30' : 'bg-bgBase border border-surfaceHover hover:border-primary/50'"
            @click="selectModel(m)"
          >
            <div class="flex items-start gap-3">
              <span class="w-5 h-5 text-primary shrink-0 mt-0.5 [&>svg]:w-full [&>svg]:h-full" v-html="m.icon" />
              <div class="min-w-0">
                <h3 class="text-textBase text-sm font-medium">{{ m.name }}</h3>
                <p class="text-textMuted text-xs mt-1 leading-relaxed">{{ m.description }}</p>
                <div class="flex flex-wrap gap-1.5 mt-2">
                  <span
                    v-for="p in m.params"
                    :key="p.name"
                    class="text-primary/70 text-[11px] bg-primary/10 px-2 py-0.5 rounded font-mono"
                  >{{ p.name }}={{ p.value }}</span>
                </div>
              </div>
            </div>
          </button>
          <div v-if="models.length === 0" class="text-center py-12 text-textMuted text-sm">暂无模型</div>
        </div>
        <div v-if="currentEntry" class="px-5 py-3 border-t border-surfaceHover shrink-0">
          <p class="text-textMuted text-xs">当前模型</p>
          <p class="text-primary text-sm font-medium truncate mt-0.5">{{ currentEntry.name }}</p>
        </div>
      </div>
    </Transition>

    <!-- 展开区：控制器列表 -->
    <Transition name="panel">
      <div v-if="controllerExpanded" class="flex-1 flex flex-col min-w-0 border-l border-surfaceHover">
        <div class="h-14 flex items-center justify-between px-5 border-b border-surfaceHover shrink-0">
          <span class="text-textBase text-sm font-bold">控制算法</span>
          <div class="flex items-center gap-2">
            <span
              class="i-carbon-help w-4 h-4 text-textMuted cursor-help"
              @mouseenter="showControllerTooltip"
              @mouseleave="hideControllerTooltip"
            />
            <Teleport to="body">
              <div
                v-if="showControllerHint"
                class="fixed w-56 p-3 bg-bgBase border border-surfaceHover rounded-lg shadow-lg text-xs text-textMuted leading-relaxed z-50"
                :style="{ left: controllerHintPos.x + 'px', top: controllerHintPos.y + 'px' }"
                @mouseenter="controllerHintHover = true"
                @mouseleave="controllerHintHover = false; showControllerHint = false"
              >
                没有找到想要的算法？欢迎提交 PR 扩充控制算法库！<br>
                <a href="https://github.com/Fuwaki/openloop" target="_blank" class="text-primary hover:underline">github.com/Fuwaki/openloop</a>
              </div>
            </Teleport>
            <button class="text-textMuted hover:text-textBase cursor-pointer" @click="controllerExpanded = false">
              <span class="i-carbon-close w-4 h-4" />
            </button>
          </div>
        </div>
        <div class="flex border-b border-surfaceHover shrink-0 overflow-x-auto">
          <button
            v-for="cat in controllerCategories"
            :key="cat.id"
            class="flex-1 py-2.5 text-sm transition-colors cursor-pointer whitespace-nowrap"
            :class="activeControllerCategory === cat.id ? 'text-primary border-b-2 border-primary' : 'text-textMuted hover:text-textBase'"
            @click="activeControllerCategory = cat.id"
          >{{ cat.label }}</button>
        </div>
        <div class="flex-1 overflow-y-auto p-3 space-y-2">
          <button
            v-for="c in controllers"
            :key="c.id"
            class="w-full text-left p-4 rounded-lg transition-colors"
            :class="[
              !c.compatible ? 'bg-bgBase border border-surfaceHover opacity-55 cursor-not-allowed' : currentController?.family.id === c.id ? 'bg-primary/10 border border-primary/30 cursor-pointer' : 'bg-bgBase border border-surfaceHover hover:border-primary/50 cursor-pointer',
            ]"
            :disabled="!c.compatible"
            @click="c.compatible && openControllerPopup(c)"
          >
            <div class="flex items-start gap-3">
              <span class="w-5 h-5 text-primary shrink-0 mt-0.5 [&>svg]:w-full [&>svg]:h-full" v-html="c.icon" />
              <div class="min-w-0">
                <h3 class="text-textBase text-sm font-medium">{{ c.name }}</h3>
                <p class="text-textMuted text-xs mt-1 leading-relaxed">{{ c.description }}</p>
                <p v-if="!c.compatible" class="text-warning text-[11px] mt-1">{{ c.reason }}</p>
                <div class="flex flex-wrap gap-1.5 mt-2">
                  <span
                    v-for="variant in c.variants"
                    :key="variant.id"
                    class="text-primary/70 text-[11px] bg-primary/10 px-2 py-0.5 rounded font-mono"
                  >{{ variant.name }}</span>
                </div>
              </div>
            </div>
          </button>
          <div v-if="controllers.length === 0" class="text-center py-12 text-textMuted text-sm">暂无控制器</div>
        </div>
        <div v-if="currentController" class="px-5 py-3 border-t border-surfaceHover shrink-0">
          <p class="text-textMuted text-xs">当前控制器</p>
          <p class="text-primary text-sm font-medium truncate mt-0.5">{{ currentController.family.name }} / {{ currentController.variant.name }}</p>
        </div>
      </div>
    </Transition>
  </div>

  <ControllerPopup
    v-if="popupController"
    :family="popupController"
    :model="currentEntry"
    @close="popupController = null"
    @select="confirmController"
  />
</template>

<style scoped>
.panel-enter-active,
.panel-leave-active {
  transition: opacity 0.15s;
}
.panel-enter-from,
.panel-leave-to {
  opacity: 0;
}
</style>

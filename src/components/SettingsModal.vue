<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import AppLogo from './AppLogo.vue'
import UiToggle from './ui/UiToggle.vue'
import { useTheme } from '@/modules/app'
import { useSettings } from '@/modules/app'
import {
  fetchPackageIndex,
  searchPackages,
  RECOMMENDED_PACKAGES,
  type PackageInfo,
} from '@/modules/python'
import { getCachedEntries, clearCache, getCacheSize } from '@/modules/python'
import { usePyodide } from '@/modules/python'

defineEmits<{
  close: []
}>()

const { hue, isDark, setHue, toggleDark } = useTheme()
const { settings, addPreloadPackage, removePreloadPackage } = useSettings()
const { isReady: pyodideReady, isLoading: pyodideLoading, restart } = usePyodide()

const tabs = [
  { id: 'general', label: '常规', icon: 'i-carbon-settings-adjust' },
  { id: 'sim', label: '仿真', icon: 'i-carbon-play-outline' },
  { id: 'python', label: 'Python', icon: 'i-carbon-logo-python' },
  { id: 'about', label: '关于', icon: 'i-carbon-information' },
]

const activeTab = ref('general')

const huePresets = [
  { h: 0, label: '红' },
  { h: 30, label: '橙' },
  { h: 55, label: '黄' },
  { h: 160, label: '绿' },
  { h: 190, label: '青' },
  { h: 220, label: '蓝' },
  { h: 270, label: '紫' },
  { h: 330, label: '粉' },
]

// ── Python 包管理 ──
const packageQuery = ref('')
const searchResults = ref<PackageInfo[]>([])
const packageIndexReady = ref(false)
const packagesDirty = ref(false)

const filteredResults = computed(() =>
  searchResults.value.filter((p) => !settings.value.preloadPackages.includes(p.name)),
)

const recommendedToAdd = computed(() =>
  RECOMMENDED_PACKAGES.filter((p) => !settings.value.preloadPackages.includes(p)),
)

onMounted(async () => {
  await fetchPackageIndex()
  packageIndexReady.value = true
})

function onSearch() {
  if (!packageIndexReady.value) return
  searchResults.value = packageQuery.value.trim() ? searchPackages(packageQuery.value) : []
}

function addPackage(name: string) {
  addPreloadPackage(name)
  packageQuery.value = ''
  searchResults.value = []
  packagesDirty.value = true
}

function handleRemovePackage(name: string) {
  removePreloadPackage(name)
  packagesDirty.value = true
}

async function handleRestart() {
  await restart()
  packagesDirty.value = false
  await refreshCacheInfo()
}

// ── 缓存管理 ──
const cacheCount = ref(0)
const cacheSize = ref(0)

async function refreshCacheInfo() {
  const entries = await getCachedEntries()
  cacheCount.value = entries.length
  cacheSize.value = await getCacheSize()
}

async function handleClearCache() {
  await clearCache()
  cacheCount.value = 0
  cacheSize.value = 0
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// 切到 Python tab 时加载缓存信息
watch(activeTab, (tab) => {
  if (tab === 'python') refreshCacheInfo()
})
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
    @click.self="$emit('close')"
  >
    <div class="bg-surface rounded-xl shadow-2xl w-[700px] h-[480px] flex overflow-hidden border border-surfaceHover">
      <!-- 左侧 tab 列表 -->
      <div class="w-40 bg-bgBase border-r border-surfaceHover flex flex-col py-4 shrink-0">
        <div class="px-4 pb-3 mb-2 border-b border-surfaceHover">
          <h2 class="text-textBase text-sm font-bold">设置</h2>
        </div>
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm transition-colors cursor-pointer"
          :class="activeTab === tab.id ? 'text-primary bg-primary/10 border-r-2 border-primary' : 'text-textMuted hover:text-textBase hover:bg-surfaceHover'"
          @click="activeTab = tab.id"
        >
          <span :class="tab.icon" class="w-4 h-4" />
          {{ tab.label }}
        </button>
      </div>

      <!-- 右侧内容 -->
      <div class="flex-1 flex flex-col overflow-hidden">
        <!-- 标题栏 -->
        <div class="flex items-center justify-between px-6 py-3 border-b border-surfaceHover">
          <h3 class="text-textBase text-sm font-medium">
            {{ tabs.find(t => t.id === activeTab)?.label }}
          </h3>
          <button
            class="text-textMuted hover:text-error w-6 h-6 flex items-center justify-center cursor-pointer"
            @click="$emit('close')"
          >
            <span class="i-carbon-close w-4 h-4" />
          </button>
        </div>

        <!-- 内容区 -->
        <div class="flex-1 overflow-y-auto p-6 space-y-5">

          <!-- 常规 -->
          <template v-if="activeTab === 'general'">
            <div class="space-y-1.5">
              <label class="text-textBase text-xs font-medium">语言</label>
              <select
                v-model="settings.language"
                class="w-full bg-bgBase text-textBase text-sm px-3 py-2 rounded-lg border border-surfaceHover focus:border-primary outline-none"
              >
                <option value="zh-CN">简体中文</option>
                <option value="en">English</option>
              </select>
            </div>
            <div class="space-y-2">
              <label class="text-textBase text-xs font-medium">主题色</label>
              <div class="flex items-center gap-2.5">
                <button
                  v-for="preset in huePresets"
                  :key="preset.h"
                  class="w-7 h-7 rounded-full border-2 transition-all cursor-pointer flex items-center justify-center"
                  :class="hue === preset.h ? 'border-textBase scale-110' : 'border-transparent hover:border-textMuted'"
                  :style="{ backgroundColor: `hsl(${preset.h}, 70%, 50%)` }"
                  :title="preset.label"
                  @click="setHue(preset.h)"
                >
                  <span
                    v-if="hue === preset.h"
                    class="w-2 h-2 rounded-full bg-white/90"
                  />
                </button>
              </div>
              <div class="flex items-center gap-3">
                <div
                  class="flex-1 h-4 rounded-full relative"
                  style="background: linear-gradient(to right, hsl(0,70%,50%), hsl(60,70%,50%), hsl(120,70%,50%), hsl(180,70%,50%), hsl(240,70%,50%), hsl(300,70%,50%), hsl(360,70%,50%))"
                >
                  <input
                    type="range"
                    :value="hue"
                    min="0"
                    max="359"
                    step="1"
                    class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    @input="setHue(+($event.target as HTMLInputElement).value)"
                  />
                  <div
                    class="absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 border-white shadow-md pointer-events-none"
                    :style="{ left: `calc(${hue / 359 * 100}% - 10px)`, backgroundColor: `hsl(${hue}, 70%, 50%)` }"
                  />
                </div>
                <span class="text-textMuted text-xs font-mono w-7 text-right">{{ hue }}°</span>
              </div>
            </div>
            <div class="flex items-center justify-between">
              <label class="text-textBase text-xs font-medium">深色模式</label>
              <UiToggle :model-value="isDark" @update:model-value="toggleDark()" />
            </div>
          </template>

          <!-- 仿真 -->
          <template v-if="activeTab === 'sim'">
            <div class="space-y-1.5">
              <label class="text-textBase text-xs font-medium">仿真步长 (s)</label>
              <input
                v-model.number="settings.simStep"
                type="number"
                step="0.001"
                min="0.001"
                class="w-full bg-bgBase text-textBase text-sm px-3 py-2 rounded-lg border border-surfaceHover focus:border-primary outline-none"
              />
            </div>
            <div class="space-y-1.5">
              <label class="text-textBase text-xs font-medium">超时时间 (s)</label>
              <input
                v-model.number="settings.simTimeout"
                type="number"
                min="1"
                class="w-full bg-bgBase text-textBase text-sm px-3 py-2 rounded-lg border border-surfaceHover focus:border-primary outline-none"
              />
            </div>
            <div class="flex items-center justify-between">
              <label class="text-textBase text-xs font-medium">代码变更后自动运行</label>
              <UiToggle v-model="settings.autoRun" />
            </div>
          </template>

          <!-- Python -->
          <template v-if="activeTab === 'python'">
            <!-- 预加载包 -->
            <div class="space-y-2">
              <label class="text-textBase text-xs font-medium">预加载包</label>
              <!-- 当前包标签 -->
              <div class="flex flex-wrap gap-1.5">
                <span
                  v-for="pkg in settings.preloadPackages"
                  :key="pkg"
                  class="inline-flex items-center gap-1 bg-primary/15 text-primary text-xs px-2 py-1 rounded-md group"
                >
                  {{ pkg }}
                  <button
                    class="text-primary/60 hover:text-error cursor-pointer leading-none"
                    @click="handleRemovePackage(pkg)"
                  >×</button>
                </span>
              </div>
              <!-- 搜索输入 -->
              <div class="relative">
                <input
                  v-model="packageQuery"
                  type="text"
                  class="w-full bg-bgBase text-textBase text-sm px-3 py-2 rounded-lg border border-surfaceHover focus:border-primary outline-none"
                  placeholder="搜索 Pyodide 包…"
                  @input="onSearch"
                  @keydown.enter="filteredResults[0] && addPackage(filteredResults[0].name)"
                />
                <!-- 搜索下拉 -->
                <div
                  v-if="filteredResults.length > 0"
                  class="absolute z-10 top-full left-0 right-0 mt-1 bg-surface border border-surfaceHover rounded-lg shadow-lg max-h-40 overflow-y-auto"
                >
                  <button
                    v-for="pkg in filteredResults"
                    :key="pkg.name"
                    class="flex items-center justify-between w-full px-3 py-2 text-sm text-textBase hover:bg-surfaceHover cursor-pointer text-left"
                    @click="addPackage(pkg.name)"
                  >
                    <span class="font-mono">{{ pkg.name }}</span>
                    <span class="text-textMuted text-xs">{{ pkg.version }}</span>
                  </button>
                </div>
              </div>
              <!-- 重启按钮（仅包列表有变更时显示） -->
              <div v-if="packagesDirty" class="flex items-center gap-2">
                <button
                  class="inline-flex items-center gap-1.5 text-xs bg-primary/15 text-primary hover:bg-primary/25 px-3 py-1.5 rounded-md transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  :disabled="pyodideLoading"
                  @click="handleRestart"
                >
                  <span :class="pyodideLoading ? 'i-carbon-circle-dash animate-spin' : 'i-carbon-restart'" class="w-3.5 h-3.5" />
                  {{ pyodideLoading ? '加载中…' : '应用并重启运行时' }}
                </button>
                <span class="text-textMuted text-xs">修改包列表后需重启生效</span>
              </div>
            </div>

            <!-- 推荐包 -->
            <div v-if="recommendedToAdd.length > 0" class="space-y-2">
              <label class="text-textBase text-xs font-medium">推荐</label>
              <div class="flex flex-wrap gap-1.5">
                <button
                  v-for="pkg in recommendedToAdd"
                  :key="pkg"
                  class="inline-flex items-center gap-1 bg-bgBase text-textMuted hover:text-primary text-xs px-2 py-1 rounded-md border border-surfaceHover hover:border-primary transition-colors cursor-pointer"
                  @click="addPackage(pkg)"
                >
                  <span class="i-carbon-add w-3 h-3" />
                  {{ pkg }}
                </button>
              </div>
            </div>

            <!-- 缓存信息 -->
            <div class="bg-bgBase rounded-lg p-4 border border-surfaceHover space-y-3">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-textBase text-xs font-medium">包缓存</p>
                  <p class="text-textMuted text-xs mt-0.5">
                    已缓存 {{ cacheCount }} 个文件，共 {{ formatSize(cacheSize) }}
                  </p>
                </div>
                <button
                  class="text-xs text-textMuted hover:text-error border border-surfaceHover hover:border-error px-2.5 py-1.5 rounded-md transition-colors cursor-pointer"
                  @click="handleClearCache"
                >
                  清空缓存
                </button>
              </div>
            </div>

            <!-- 版本信息 -->
            <div class="bg-bgBase rounded-lg p-4 border border-surfaceHover">
              <p class="text-textMuted text-xs">Pyodide 版本: <span class="text-textBase">0.29.4</span></p>
              <p class="text-textMuted text-xs mt-1">Python 版本: <span class="text-textBase">3.13</span></p>
            </div>
          </template>

          <!-- 关于 -->
          <template v-if="activeTab === 'about'">
            <div class="flex flex-col items-center py-4 space-y-5">
              <AppLogo :size="56" show-text />
              <p class="text-textMuted text-sm">交互式控制算法仿真 Playground</p>

              <div class="w-full bg-bgBase rounded-lg p-4 border border-surfaceHover space-y-2.5">
                <div class="flex items-center justify-between">
                  <span class="text-textMuted text-xs">版本</span>
                  <span class="text-primary text-xs font-mono">v0.0.1</span>
                </div>
                <div class="border-t border-surfaceHover" />
                <div class="flex items-center justify-between">
                  <span class="text-textMuted text-xs">前端框架</span>
                  <span class="text-textBase text-xs font-mono">Vue 3 + Vite + UnoCSS</span>
                </div>
                <div class="border-t border-surfaceHover" />
                <div class="flex items-center justify-between">
                  <span class="text-textMuted text-xs">Python 运行时</span>
                  <span class="text-textBase text-xs font-mono">Pyodide 0.29.4</span>
                </div>
                <div class="border-t border-surfaceHover" />
                <div class="flex items-center justify-between">
                  <span class="text-textMuted text-xs">渲染 / 图表 / 编辑器</span>
                  <span class="text-textBase text-xs font-mono">PixiJS + uPlot + Monaco</span>
                </div>
              </div>

              <a
                href="https://github.com/Fuwaki/openloop"
                target="_blank"
                class="flex items-center gap-1.5 text-textMuted hover:text-primary text-xs transition-colors"
              >
                <span class="i-carbon-logo-github w-4 h-4" />
                github.com/Fuwaki/openloop
              </a>

              <p class="text-textMuted/50 text-[10px]">Made with ❤ for students and control engineers</p>
            </div>
          </template>

        </div>
      </div>
    </div>
  </div>
</template>

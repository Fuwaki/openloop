<script setup lang="ts">
import { ref } from 'vue'
import AppLogo from './AppLogo.vue'
import UiToggle from './ui/UiToggle.vue'
import { useTheme } from '@/composables/useTheme'

defineEmits<{
  close: []
}>()

const { hue, isDark, setHue, toggleDark } = useTheme()

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

// 模拟设置数据
const settings = ref({
  language: 'zh-CN',
  simStep: 0.01,
  simTimeout: 30,
  autoRun: false,
  preloadPackages: 'numpy',
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
            <div class="space-y-1.5">
              <label class="text-textBase text-xs font-medium">预加载包（逗号分隔）</label>
              <input
                v-model="settings.preloadPackages"
                type="text"
                class="w-full bg-bgBase text-textBase text-sm px-3 py-2 rounded-lg border border-surfaceHover focus:border-primary outline-none"
                placeholder="numpy, scipy, matplotlib"
              />
              <p class="text-textMuted text-xs">Pyodide 启动时自动加载的 Python 包</p>
            </div>
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

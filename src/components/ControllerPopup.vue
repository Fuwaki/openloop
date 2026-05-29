<script setup lang="ts">
import { computed, ref } from 'vue'
import { generateControllerCode } from '@/composables/useCodeGenerator'
import type { ControllerEntry } from '@/models/controller-table'
import type { ModelEntry } from '@/models/model-table'

const props = defineProps<{
  controller: ControllerEntry
  model: ModelEntry | null
}>()

const emit = defineEmits<{
  close: []
  select: []
}>()

const confirming = ref(false)

const code = computed(() =>
  props.model
    ? generateControllerCode(props.model, props.controller.starterCode, props.controller.inputRequirements)
    : props.controller.starterCode,
)
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center" @click.self="emit('close')">
      <!-- 背景遮罩 -->
      <div class="absolute inset-0 bg-black/40" @click="emit('close')" />

      <!-- 面板 -->
      <div class="relative w-[56rem] max-w-[90vw] h-[32rem] max-h-[80vh] bg-surface rounded-xl border border-surfaceHover shadow-2xl flex overflow-hidden">
        <!-- 左侧：控制器介绍 -->
        <div class="w-72 shrink-0 flex flex-col border-r border-surfaceHover bg-bgBase">
          <div class="p-5 border-b border-surfaceHover">
            <div class="flex items-center gap-2.5">
              <span class="w-5 h-5 text-primary [&>svg]:w-full [&>svg]:h-full" v-html="controller.icon" />
              <h2 class="text-textBase text-base font-bold">{{ controller.name }}</h2>
            </div>
            <p class="text-textMuted text-xs mt-2 leading-relaxed">{{ controller.description }}</p>
          </div>

          <div class="flex-1 overflow-y-auto p-5 space-y-4">
            <!-- 分类 -->
            <div>
              <p class="text-textMuted text-[11px] uppercase tracking-wide mb-1">分类</p>
              <span class="text-primary text-xs bg-primary/10 px-2 py-0.5 rounded">{{ controller.category }}</span>
            </div>

            <!-- 参数 -->
            <div v-if="controller.params.length > 0">
              <p class="text-textMuted text-[11px] uppercase tracking-wide mb-2">参数</p>
              <div class="space-y-1.5">
                <div v-for="p in controller.params" :key="p.name" class="flex items-center justify-between">
                  <span class="text-textBase text-xs font-mono">{{ p.name }}</span>
                  <span class="text-textMuted text-xs">{{ p.value }}</span>
                </div>
              </div>
            </div>

            <!-- 输入需求 -->
            <div v-if="controller.inputRequirements.length > 0">
              <p class="text-textMuted text-[11px] uppercase tracking-wide mb-2">需要的输入</p>
              <div class="space-y-1.5">
                <div v-for="(req, i) in controller.inputRequirements" :key="i">
                  <p class="text-textBase text-xs">{{ req.description }}</p>
                  <p class="text-textMuted text-[11px]">可接受: {{ req.acceptableTags.join(', ') }}</p>
                </div>
              </div>
            </div>

            <!-- 系统要求 -->
            <div v-if="controller.requiredSystemTags.length > 0">
              <p class="text-textMuted text-[11px] uppercase tracking-wide mb-2">系统要求</p>
              <div class="flex flex-wrap gap-1">
                <span v-for="tag in controller.requiredSystemTags" :key="tag" class="text-warning text-[11px] bg-warning/10 px-1.5 py-0.5 rounded">
                  {{ tag }}
                </span>
              </div>
            </div>
          </div>

          <!-- 使用按钮 -->
          <div class="p-4 border-t border-surfaceHover space-y-2">
            <p v-if="confirming" class="text-warning text-[11px] text-center leading-relaxed">
              重新生成代码会覆盖编辑器中的更改
            </p>
            <button
              class="w-full py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer"
              :class="confirming ? 'bg-warning text-white hover:bg-warning/90' : 'bg-primary text-white hover:bg-primary/90'"
              @click="confirming ? emit('select') : confirming = true"
            >
              {{ confirming ? '确认覆盖' : '使用此控制器' }}
            </button>
          </div>
        </div>

        <!-- 右侧：生成的代码 -->
        <div class="flex-1 flex flex-col min-w-0">
          <div class="h-10 flex items-center justify-between px-4 border-b border-surfaceHover shrink-0">
            <span class="text-textMuted text-xs font-medium">生成的控制器模板</span>
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

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useSimulationState } from '@/composables/useSimulationState'
import { useModelLoader } from '@/composables/useModelLoader'
import { useSimulationRunner } from '@/composables/useSimulationRunner'
import type { SolverId } from '@/composables/useSimulationRunner'

const { currentPlant, currentParams } = useModelLoader()
const { currentState, currentInput, currentIntermediates, solverStats, controllerStats, controllerStatus, controllerStatusNames, isSimulationRunning } = useSimulationState()
const runner = useSimulationRunner()

type TabId = 'inspector' | 'env'
const activeTab = ref<TabId>('inspector')
const panelOpen = ref(true)

const collapsed = ref<Set<string>>(new Set())

function toggleCollapse(id: string) {
  if (collapsed.value.has(id)) {
    collapsed.value.delete(id)
  } else {
    collapsed.value.add(id)
  }
}

// ── 检查器 tab ──────────────────────────────────────────────

interface InspectorItem {
  label: string
  value: string
  live?: boolean
}

const sections = computed(() => [
  {
    id: 'model',
    title: '被控系统',
    icon: 'i-carbon-cube',
    items: (currentPlant.value
      ? [{ label: currentPlant.value.name, value: currentPlant.value.description }]
      : [{ label: '未选择模型', value: '请在侧栏中选择被控模型' }]) as InspectorItem[],
  },
  {
    id: 'params',
    title: '模型参数',
    icon: 'i-carbon-settings-adjust',
    items: (currentPlant.value
      ? Object.entries(currentPlant.value.params).map(([name, value]) => ({
          label: name,
          value: Number(value).toFixed(3),
        }))
      : []) as InspectorItem[],
  },
  {
    id: 'states',
    title: '状态变量',
    icon: 'i-carbon-chart-line-data',
    items: (currentPlant.value
      ? currentPlant.value.stateVars.map((v, i) => ({
          label: v.name,
          value: currentState.value
            ? `${currentState.value[i]!.toFixed(4)}${v.unit ? ' ' + v.unit : ''}`
            : '开始仿真以查看数值',
          live: !!currentState.value,
        }))
      : []) as InspectorItem[],
  },
  {
    id: 'inputs',
    title: '输入变量',
    icon: 'i-carbon-arrow-down',
    items: (currentPlant.value
      ? currentPlant.value.inputVars.map((v, i) => ({
          label: v.name,
          value: currentInput.value
            ? `${currentInput.value[i]!.toFixed(4)}${v.unit ? ' ' + v.unit : ''}`
            : '开始仿真以查看数值',
          live: !!currentInput.value,
        }))
      : []) as InspectorItem[],
  },
  {
    id: 'intermediates',
    title: '中间变量',
    icon: 'i-carbon-connect',
    items: (currentPlant.value
      ? currentPlant.value.intermediateVars.map((v, i) => ({
          label: v.name,
          value: currentIntermediates.value
            ? `${currentIntermediates.value[i]!.toFixed(4)}${v.unit ? ' ' + v.unit : ''}`
            : '开始仿真以查看数值',
          live: !!currentIntermediates.value,
        }))
      : []) as InspectorItem[],
  },
  {
    id: 'controller-status',
    title: 'Controller 状态',
    icon: 'i-carbon-data-vis-4',
    items: (isSimulationRunning.value
      ? controllerStatus.value.map((s) => ({
          label: s.name,
          value: s.value.toFixed(4),
          live: true,
        }))
      : controllerStatusNames.value.map((name) => {
          const live = controllerStatus.value.find((s) => s.name === name)
          return {
            label: name,
            value: live ? live.value.toFixed(4) : '开始仿真以查看数值',
            live: false,
          }
        })) as InspectorItem[],
  },
  {
    id: 'controller',
    title: 'Python 解释器',
    icon: 'i-carbon-script',
    items: (controllerStats.value
      ? [
          { label: '上次调用', value: `${controllerStats.value.lastCallTime.toFixed(3)} ms` },
          { label: '平均', value: `${controllerStats.value.avgCallTime.toFixed(3)} ms` },
        ]
      : [{ label: '状态', value: '未运行' }]) as InspectorItem[],
  },
  {
    id: 'sim',
    title: '求解器',
    icon: 'i-carbon-timer',
    items: (solverStats.value
      ? [
          { label: '算法', value: solverStats.value.solverId },
          { label: '仿真时间', value: `${solverStats.value.simTime.toFixed(4)} s` },
          { label: '步数', value: String(solverStats.value.stepCount) },
          { label: '上一步', value: `${solverStats.value.wallTimeLastStep.toFixed(3)} ms` },
          { label: '平均', value: `${solverStats.value.wallTimeAvg.toFixed(3)} ms` },
          { label: '吞吐量', value: `${solverStats.value.stepsPerSecond.toFixed(0)} steps/s` },
          { label: '总时间', value: `${solverStats.value.wallTimeTotal.toFixed(1)} ms` },
        ]
      : [{ label: '状态', value: '未运行' }]) as InspectorItem[],
  },
])

// ── 环境配置 tab ──────────────────────────────────────────────

const solverOptions: { id: SolverId; label: string; desc: string }[] = [
  { id: 'rk4', label: 'RK4', desc: '四阶精度，通用首选' },
  { id: 'euler', label: 'Euler', desc: '一阶精度，速度快' },
]

const dtPresets = [0.001, 0.002, 0.005, 0.01, 0.02]

const envParams = computed(() => currentParams.value.filter((p) => p.env))

function onSolverChange(id: SolverId) {
  runner.setSolver(id)
}

function onDtInput(e: Event) {
  runner.setSimDt(Number((e.target as HTMLInputElement).value))
}

function onDtPreset(v: number) {
  runner.setSimDt(v)
}
</script>

<template>
  <!-- 收起状态：右侧胶囊 -->
  <button
    v-if="!panelOpen"
    class="shrink-0 w-7 h-full bg-surface border-l border-surfaceHover flex items-center justify-center cursor-pointer hover:bg-surfaceHover transition-colors group"
    @click="panelOpen = true"
  >
    <span class="i-carbon-chevron-left w-3.5 h-3.5 text-textMuted group-hover:text-primary transition-colors" />
  </button>

  <!-- 展开状态：完整面板 -->
  <div v-else class="w-72 h-full bg-surface border-l border-surfaceHover flex flex-col shrink-0 overflow-hidden">
    <!-- Tab 切换 + 收起按钮 -->
    <div class="flex shrink-0 border-b border-surfaceHover">
      <button
        class="flex-1 h-9 text-xs font-medium transition-colors cursor-pointer"
        :class="activeTab === 'inspector' ? 'text-primary border-b-2 border-primary bg-bgBase' : 'text-textMuted hover:text-textBase'"
        @click="activeTab = 'inspector'"
      >
        检查器
      </button>
      <button
        class="flex-1 h-9 text-xs font-medium transition-colors cursor-pointer"
        :class="activeTab === 'env' ? 'text-primary border-b-2 border-primary bg-bgBase' : 'text-textMuted hover:text-textBase'"
        @click="activeTab = 'env'"
      >
        环境配置
      </button>
      <button
        class="w-9 h-9 flex items-center justify-center text-textMuted hover:text-textBase hover:bg-surfaceHover transition-colors cursor-pointer shrink-0"
        @click="panelOpen = false"
      >
        <span class="i-carbon-chevron-right w-3.5 h-3.5" />
      </button>
    </div>

    <!-- 检查器 tab -->
    <div v-if="activeTab === 'inspector'" class="flex-1 overflow-y-auto">
      <div v-for="section in sections" :key="section.id" class="border-b border-surfaceHover">
        <!-- 区块标题（可点击折叠） -->
        <button
          class="w-full flex items-center gap-2 px-4 py-2.5 bg-bgBase cursor-pointer hover:bg-surfaceHover transition-colors text-left"
          @click="toggleCollapse(section.id)"
        >
          <span
            class="i-carbon-chevron-right w-3 h-3 text-textMuted transition-transform duration-200 shrink-0"
            :class="{ 'rotate-90': !collapsed.has(section.id) }"
          />
          <span :class="section.icon" class="text-primary w-3.5 h-3.5" />
          <span class="text-textBase text-xs font-medium">{{ section.title }}</span>
          <span class="text-textMuted text-[10px] ml-auto">{{ section.items.length }}</span>
        </button>

        <!-- 区块内容（带折叠动画） -->
        <div
          class="grid transition-[grid-template-rows] duration-200 ease-in-out"
          :style="{ gridTemplateRows: collapsed.has(section.id) ? '0fr' : '1fr' }"
        >
          <div class="overflow-hidden">
            <div class="px-4 py-2 space-y-1.5">
              <div
                v-for="(item, i) in section.items"
                :key="i"
                class="flex items-center justify-between gap-2"
              >
                <span class="text-textMuted text-xs shrink-0">{{ item.label }}</span>
                <div class="flex items-center gap-1.5 min-w-0">
                  <span
                    v-if="item.live && solverStats?.stepCount"
                    class="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shrink-0"
                  />
                  <span class="text-textBase text-xs font-mono truncate text-right">{{ item.value }}</span>
                </div>
              </div>

              <div v-if="section.items.length === 0" class="text-textMuted text-xs py-1">
                暂无数据
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 环境配置 tab -->
    <div v-else class="flex-1 overflow-y-auto p-4 space-y-5">
      <!-- 求解器选择 -->
      <div class="space-y-2">
        <h3 class="text-textMuted text-[10px] uppercase tracking-wider font-medium">求解器</h3>
        <div class="space-y-1">
          <button
            v-for="opt in solverOptions"
            :key="opt.id"
            class="w-full flex items-center gap-3 px-3 py-2 rounded-lg border transition-colors cursor-pointer text-left"
            :class="runner.solverId.value === opt.id
              ? 'border-primary bg-primary/10 text-textBase'
              : 'border-surfaceHover hover:border-textMuted text-textMuted'"
            @click="onSolverChange(opt.id)"
          >
            <span
              class="w-3 h-3 rounded-full border-2 shrink-0 transition-colors"
              :class="runner.solverId.value === opt.id ? 'border-primary bg-primary' : 'border-surfaceHover'"
            />
            <div class="flex-1 min-w-0">
              <span class="text-xs font-medium block">{{ opt.label }}</span>
              <span class="text-[10px] text-textMuted block">{{ opt.desc }}</span>
            </div>
          </button>
        </div>
      </div>

      <!-- 仿真步长 -->
      <div class="space-y-2">
        <h3 class="text-textMuted text-[10px] uppercase tracking-wider font-medium">仿真步长 (dt)</h3>
        <div class="flex items-center gap-2">
          <input
            type="number"
            :value="runner.simDt.value"
            min="0.0001"
            max="0.1"
            step="0.001"
            class="flex-1 bg-bgBase text-textBase text-xs font-mono px-2 py-1.5 rounded border border-surfaceHover focus:border-primary outline-none"
            @input="onDtInput"
          />
          <span class="text-textMuted text-[10px] shrink-0">秒</span>
        </div>
        <div class="flex flex-wrap gap-1">
          <button
            v-for="p in dtPresets"
            :key="p"
            class="px-2 py-0.5 rounded text-[10px] font-mono border transition-colors cursor-pointer"
            :class="runner.simDt.value === p
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-surfaceHover text-textMuted hover:text-textBase hover:border-textMuted'"
            @click="onDtPreset(p)"
          >
            {{ p }}
          </button>
        </div>
      </div>

      <!-- 环境参数 -->
      <div class="space-y-2">
        <h3 class="text-textMuted text-[10px] uppercase tracking-wider font-medium">环境参数</h3>
        <div v-if="envParams.length > 0" class="space-y-2">
          <div
            v-for="p in envParams"
            :key="p.name"
            class="space-y-1"
          >
            <div class="flex items-center justify-between">
              <span class="text-textBase text-xs font-mono">{{ p.name }}</span>
              <span class="text-textMuted text-[10px] font-mono">{{ Number(p.value).toFixed(3) }}</span>
            </div>
            <div class="relative flex items-center h-4">
              <div class="absolute inset-x-0 h-1 rounded-full bg-surfaceHover">
                <div
                  class="absolute h-full rounded-full bg-primary/60"
                  :style="{ width: ((p.value - p.min) / (p.max - p.min) * 100) + '%' }"
                />
              </div>
              <input
                type="range"
                :value="p.value"
                :min="p.min"
                :max="p.max"
                :step="p.step ?? 0.01"
                class="absolute inset-x-0 w-full h-4 opacity-0 cursor-pointer"
                @input="p.value = Number(($event.target as HTMLInputElement).value); currentPlant?.setParam(p.name, p.value)"
              />
              <div
                class="absolute w-2.5 h-2.5 rounded-full bg-primary shadow-sm pointer-events-none"
                :style="{ left: `calc(${(p.value - p.min) / (p.max - p.min) * 100}% - 5px)` }"
              />
            </div>
          </div>
        </div>
        <div v-else class="text-textMuted text-xs py-1">
          {{ currentPlant ? '当前模型没有环境参数' : '请先选择被控模型' }}
        </div>
      </div>
    </div>
  </div>
</template>

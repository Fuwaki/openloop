<script setup lang="ts">
import { ref } from 'vue'
import Sidebar from './components/Sidebar.vue'
import ViewTabs from './components/ViewTabs.vue'
import PanelManager from './components/PanelManager.vue'
import RightPanel from './components/RightPanel.vue'
import SettingsModal from './components/SettingsModal.vue'
import ToastContainer from './components/ToastContainer.vue'
import { getViewPresets, type ViewPreset } from './views/registry'
import { useModelLoader } from './modules/models'
import { DEFAULT_MODEL_ID } from './modules/models'
import { injectSimulationStop } from './modules/models'
import { useSimulationRunner } from './modules/simulation'
import { injectGetPlant } from './modules/simulation'
import { setOutputSink } from './modules/python'
import { appendOutput } from './modules/simulation'

const showSettings = ref(false)
const currentView = ref<ViewPreset>(getViewPresets()[0]!)

// 默认加载弹簧振子模型
const { loadModel, currentPlant } = useModelLoader()
void loadModel(DEFAULT_MODEL_ID)

// 注入依赖
injectSimulationStop(() => useSimulationRunner().stop())
injectGetPlant(() => currentPlant.value)
setOutputSink(appendOutput)
</script>

<template>
  <div class="h-screen bg-bgBase flex">
    <Sidebar @open-settings="showSettings = true" />
    <div class="flex-1 min-w-0 flex flex-col">
      <ViewTabs v-model="currentView" />
      <div class="flex-1 min-h-0">
        <PanelManager />
      </div>
    </div>
    <RightPanel />
    <SettingsModal v-if="showSettings" @close="showSettings = false" />
    <ToastContainer />
  </div>
</template>

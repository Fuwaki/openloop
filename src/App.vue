<script setup lang="ts">
import { ref } from 'vue'
import Sidebar from './components/Sidebar.vue'
import ViewTabs from './components/ViewTabs.vue'
import PanelManager from './components/PanelManager.vue'
import RightPanel from './components/RightPanel.vue'
import SettingsModal from './components/SettingsModal.vue'
import ToastContainer from './components/ToastContainer.vue'
import { getViewPresets, type ViewPreset } from './views/registry'
import { useModelLoader } from './composables/useModelLoader'
import { DEFAULT_MODEL_ID } from './models/model-table'

const showSettings = ref(false)
const currentView = ref<ViewPreset>(getViewPresets()[0]!)

// 默认加载弹簧振子模型
const { loadModel } = useModelLoader()
void loadModel(DEFAULT_MODEL_ID)
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

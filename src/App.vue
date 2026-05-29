<script setup lang="ts">
import { ref } from 'vue'
import Sidebar from './components/Sidebar.vue'
import ViewTabs from './components/ViewTabs.vue'
import PanelManager from './components/PanelManager.vue'
import RightPanel from './components/RightPanel.vue'
import SettingsModal from './components/SettingsModal.vue'
import type { PlantModel } from './models/registry'
import type { ViewPreset } from './views/registry'

const showSettings = ref(false)
const currentModel = ref<PlantModel | null>(null)
const currentView = ref<ViewPreset | null>(null)

const modelStates = ref([
  { name: 'x', value: 0, unit: 'm' },
  { name: 'ẋ', value: 0, unit: 'm/s' },
  { name: 'θ', value: 0, unit: 'rad' },
])
</script>

<template>
  <div class="h-screen bg-bgBase flex">
    <Sidebar
      v-model="currentModel"
      @open-settings="showSettings = true"
    />
    <div class="flex-1 min-w-0 flex flex-col">
      <ViewTabs v-model="currentView" />
      <div class="flex-1 min-h-0">
        <PanelManager />
      </div>
    </div>
    <RightPanel
      :model-name="currentModel?.name"
      :model-description="currentModel?.description"
      :model-params="currentModel?.params"
      :model-states="modelStates"
    />
    <SettingsModal v-if="showSettings" @close="showSettings = false" />
  </div>
</template>

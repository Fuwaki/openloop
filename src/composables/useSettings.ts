import { ref } from 'vue'

const STORAGE_KEY = 'openloop-settings'

export interface AppSettings {
  language: string
  preloadPackages: string[]
  simStep: number
  simTimeout: number
  autoRun: boolean
}

const defaults: AppSettings = {
  language: 'zh-CN',
  preloadPackages: ['numpy'],
  simStep: 0.005,
  simTimeout: 30,
  autoRun: false,
}

const settings = ref<AppSettings>({ ...defaults })

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const data = JSON.parse(raw)
      if (typeof data.language === 'string') settings.value.language = data.language
      if (Array.isArray(data.preloadPackages)) settings.value.preloadPackages = data.preloadPackages
      if (typeof data.simStep === 'number') settings.value.simStep = data.simStep
      if (typeof data.simTimeout === 'number') settings.value.simTimeout = data.simTimeout
      if (typeof data.autoRun === 'boolean') settings.value.autoRun = data.autoRun
    }
  } catch {}
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings.value))
}

function updateSettings(partial: Partial<AppSettings>) {
  Object.assign(settings.value, partial)
  persist()
}

function addPreloadPackage(name: string) {
  const pkg = name.trim().toLowerCase()
  if (!pkg || settings.value.preloadPackages.includes(pkg)) return
  settings.value.preloadPackages.push(pkg)
  persist()
}

function removePreloadPackage(name: string) {
  settings.value.preloadPackages = settings.value.preloadPackages.filter((p) => p !== name)
  persist()
}

load()

export function useSettings() {
  return {
    settings,
    updateSettings,
    addPreloadPackage,
    removePreloadPackage,
  }
}

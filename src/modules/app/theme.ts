import { ref } from 'vue'

const STORAGE_KEY = 'openloop-theme'

const hue = ref(160)
const isDark = ref(true)
let initialized = false

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  let r = 0, g = 0, b = 0
  if (h < 60) { r = c; g = x }
  else if (h < 120) { r = x; g = c }
  else if (h < 180) { g = c; b = x }
  else if (h < 240) { g = x; b = c }
  else if (h < 300) { r = x; b = c }
  else { r = c; b = x }
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ]
}

function applyTheme() {
  const root = document.documentElement
  const [r, g, b] = hslToRgb(hue.value, 0.7, 0.5)
  const primary = `${r} ${g} ${b}`
  root.style.setProperty('--c-primary', primary)
  root.style.setProperty('--c-primary-dim', primary)

  if (isDark.value) {
    root.classList.remove('light')
    root.style.removeProperty('--c-bg-base')
    root.style.removeProperty('--c-bg-surface')
    root.style.removeProperty('--c-bg-surface-hover')
    root.style.removeProperty('--c-text-base')
    root.style.removeProperty('--c-text-muted')
  } else {
    root.classList.add('light')
    root.style.setProperty('--c-bg-base', '245 245 245')
    root.style.setProperty('--c-bg-surface', '255 255 255')
    root.style.setProperty('--c-bg-surface-hover', '229 229 229')
    root.style.setProperty('--c-text-base', '26 26 26')
    root.style.setProperty('--c-text-muted', '102 102 102')
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ hue: hue.value, isDark: isDark.value }))
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const data = JSON.parse(raw)
      if (typeof data.hue === 'number') hue.value = data.hue
      if (typeof data.isDark === 'boolean') isDark.value = data.isDark
    }
  } catch {}
}

function setHue(h: number) {
  hue.value = h
  applyTheme()
  persist()
}

function toggleDark() {
  isDark.value = !isDark.value
  applyTheme()
  persist()
}

export function useTheme() {
  if (!initialized) {
    initialized = true
    load()
    applyTheme()
  }
  return { hue, isDark, setHue, toggleDark }
}

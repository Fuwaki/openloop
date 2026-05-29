import { defineConfig, presetUno, presetIcons } from 'unocss'

export default defineConfig({
  presets: [
    presetUno(),
    presetIcons({
      scale: 1.2,
      warn: true,
    }),
  ],
  theme: {
    colors: {
      bgBase: 'var(--c-bg-base)',
      surface: 'var(--c-bg-surface)',
      surfaceHover: 'var(--c-bg-surface-hover)',
      primary: 'rgb(var(--c-primary))',
      primaryDim: 'rgba(var(--c-primary-dim), 0.2)',
      textBase: 'var(--c-text-base)',
      textMuted: 'var(--c-text-muted)',
      error: 'var(--c-error)',
      warning: 'var(--c-warning)',
    }
  }
})

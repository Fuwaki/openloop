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
      bgBase: 'rgb(var(--c-bg-base))',
      surface: 'rgb(var(--c-bg-surface))',
      surfaceHover: 'rgb(var(--c-bg-surface-hover))',
      primary: 'rgb(var(--c-primary))',
      primaryDim: 'rgba(var(--c-primary-dim), 0.2)',
      textBase: 'rgb(var(--c-text-base))',
      textMuted: 'rgb(var(--c-text-muted))',
      error: 'rgb(var(--c-error))',
      warning: 'rgb(var(--c-warning))',
    }
  }
})

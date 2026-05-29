import type { SandboxTheme } from './types'

function readCssColor(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return value || fallback
}

function cssHexToNumber(value: string): number {
  const hex = value.replace('#', '').trim()
  if (hex.length === 3) {
    return Number.parseInt(hex.split('').map((c) => c + c).join(''), 16)
  }
  return Number.parseInt(hex.slice(0, 6), 16)
}

function cssRgbVarToNumber(value: string): number {
  const [r = 0, g = 0, b = 0] = value.split(/\s+/).map((part) => Number.parseInt(part, 10))
  return (r << 16) + (g << 8) + b
}

export function createSandboxTheme(): SandboxTheme {
  const bgBase = cssHexToNumber(readCssColor('--c-bg-base', '#121212'))
  const surface = cssHexToNumber(readCssColor('--c-bg-surface', '#1e1e1e'))
  const surfaceHover = cssHexToNumber(readCssColor('--c-bg-surface-hover', '#2a2a2a'))
  const primary = cssRgbVarToNumber(readCssColor('--c-primary', '16 185 129'))
  const text = cssHexToNumber(readCssColor('--c-text-base', '#e5e5e5'))
  const textMuted = cssHexToNumber(readCssColor('--c-text-muted', '#888888'))

  return {
    background: bgBase,
    grid: 0x1b1f1d,
    gridMajor: 0x26312d,
    axis: 0x31423b,
    ground: 0x202522,
    groundStroke: 0x6f7b75,
    bodyFill: 0x24302c,
    bodyStroke: 0xd6e2dc,
    bodyAccent: primary,
    ballFill: 0x24302c,
    spring: 0xb9c7c0,
    joint: 0x24302c,
    link: 0xb9c7c0,
    force: primary,
    velocity: 0x9fb7ad,
    scalar: 0xd6e2dc,
    text,
    textMuted,
    panelFill: surface,
    panelStroke: surfaceHover,
  }
}

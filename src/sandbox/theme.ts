import type { SandboxTheme } from './types'

function readCssColor(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return value || fallback
}

function cssRgbVarToNumber(value: string): number {
  const [r = 0, g = 0, b = 0] = value.split(/\s+/).map((part) => Number.parseInt(part, 10))
  return (r << 16) + (g << 8) + b
}

export function createSandboxTheme(): SandboxTheme {
  const bgBase = cssRgbVarToNumber(readCssColor('--c-bg-base', '18 18 18'))
  const surface = cssRgbVarToNumber(readCssColor('--c-bg-surface', '30 30 30'))
  const surfaceHover = cssRgbVarToNumber(readCssColor('--c-bg-surface-hover', '42 42 42'))
  const primary = cssRgbVarToNumber(readCssColor('--c-primary', '16 185 129'))
  const text = cssRgbVarToNumber(readCssColor('--c-text-base', '229 229 229'))
  const textMuted = cssRgbVarToNumber(readCssColor('--c-text-muted', '136 136 136'))

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

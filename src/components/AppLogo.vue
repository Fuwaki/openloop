<script setup lang="ts">
withDefaults(
  defineProps<{
    /** Show full logo (icon + text), false = icon only */
    showText?: boolean
    /** Logo height in px */
    size?: number
  }>(),
  { showText: false, size: 32 },
)
</script>

<template>
  <div class="flex items-center cursor-pointer opacity-90 hover:opacity-100 transition-opacity select-none">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      :viewBox="showText ? '0 0 140 32' : '0 0 40 32'"
      :width="showText ? size * (140 / 32) : size * (40 / 32)"
      :height="size"
      fill="none"
    >
      <g stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M 4 16 L 12 16" stroke="#E5E5E5" />
        <rect x="12" y="9" width="14" height="14" rx="2" stroke="#10B981" />
        <path d="M 26 16 L 36 16" stroke="#E5E5E5" />
        <path d="M 32 13 L 36 16 L 32 19" stroke="#E5E5E5" />
      </g>

      <text
        v-if="showText"
        x="44"
        y="22"
        font-family="ui-monospace, SFMono-Regular, Consolas, monospace"
        font-size="18"
        font-weight="600"
        letter-spacing="0.5"
      >
        <tspan fill="#E5E5E5">Open</tspan><tspan fill="#10B981">Loop</tspan>
      </text>
    </svg>
  </div>
</template>

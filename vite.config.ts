import { fileURLToPath, URL } from 'node:url'
import { execSync } from 'node:child_process'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import UnoCSS from 'unocss/vite'

function getGitVersion(): string {
  try {
    // 优先获取当前 commit 指向的 tag
    const tag = execSync('git tag --points-at HEAD', { encoding: 'utf-8' }).trim()
    if (tag) return tag
    // 没有 tag 则显示 branch (commit)
    const branch = execSync('git branch --show-current', { encoding: 'utf-8' }).trim()
    const hash = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim()
    return `${branch} (${hash})`
  } catch {
    return 'unknown'
  }
}

export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [
    vue(),
    vueDevTools(),
    UnoCSS(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(getGitVersion()),
  },
})

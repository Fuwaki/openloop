import { ref } from 'vue'

export type ToastType = 'error' | 'warning' | 'info'

export interface Toast {
  id: number
  type: ToastType
  message: string
}

const toasts = ref<Toast[]>([])
let nextId = 0

function remove(id: number) {
  const idx = toasts.value.findIndex((t) => t.id === id)
  if (idx !== -1) toasts.value.splice(idx, 1)
}

function toast(message: string, type: ToastType = 'info', duration = 4000) {
  const id = nextId++
  toasts.value.push({ id, type, message })
  if (duration > 0) {
    setTimeout(() => remove(id), duration)
  }
}

export function useToast() {
  return { toasts, toast, remove }
}

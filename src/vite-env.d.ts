/// <reference types="vite/client" />

declare module 'virtual:uno.css' {}
declare module 'splitpanes' {
  export const Splitpanes: import('vue').DefineComponent<{
    horizontal?: boolean
    pushOtherPanes?: boolean
    dblClickSplitter?: boolean
    firstSplitter?: boolean
  }>
  export const Pane: import('vue').DefineComponent<{
    size?: number | string
    minSize?: number | string
    maxSize?: number | string
  }>
}

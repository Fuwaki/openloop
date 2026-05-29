import * as monaco from 'monaco-editor'

// 与 base.css 设计 token 对齐的 Monaco 主题
export const OPENLOOP_DARK: monaco.editor.IStandaloneThemeData = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'comment', foreground: '888888', fontStyle: 'italic' },
    { token: 'keyword', foreground: '10b981' },
    { token: 'string', foreground: 'f59e0b' },
    { token: 'number', foreground: 'f59e0b' },
    { token: 'type', foreground: '10b981' },
    { token: 'function', foreground: 'e5e5e5' },
    { token: 'variable', foreground: 'e5e5e5' },
    { token: 'operator', foreground: '10b981' },
  ],
  colors: {
    'editor.background': '#121212',
    'editor.foreground': '#e5e5e5',
    'editor.lineHighlightBackground': '#1e1e1e',
    'editor.selectionBackground': '#10b98133',
    'editor.inactiveSelectionBackground': '#10b9811a',
    'editorCursor.foreground': '#10b981',
    'editorLineNumber.foreground': '#888888',
    'editorLineNumber.activeForeground': '#e5e5e5',
    'editorIndentGuide.background': '#2a2a2a',
    'editorIndentGuide.activeBackground': '#888888',
    'editor.selectionHighlightBackground': '#10b9811a',
    'editorBracketMatch.background': '#10b98133',
    'editorBracketMatch.border': '#10b981',
    'editorGutter.background': '#121212',
    'scrollbar.shadow': '#00000000',
    'scrollbarSlider.background': '#2a2a2a80',
    'scrollbarSlider.hoverBackground': '#88888880',
    'scrollbarSlider.activeBackground': '#888888',
    'minimap.background': '#121212',
  },
}

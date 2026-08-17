'use client'

// Tabキーでフォーカスを移動せず \t を挿入するtextarea。本文などタブ文字を含めたい入力に使う
// Shift+Tabなど修飾キー付きは通常のフォーカス移動のままにする（キーボード操作での脱出手段を残す）
export function ContentTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      onKeyDown={(e) => {
        if (e.key === 'Tab' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault()
          // execCommandはUndo履歴に載るため優先し、非対応環境のみsetRangeTextで代替する
          if (!document.execCommand('insertText', false, '\t')) {
            const el = e.currentTarget
            el.setRangeText('\t', el.selectionStart, el.selectionEnd, 'end')
          }
        }
        props.onKeyDown?.(e)
      }}
    />
  )
}

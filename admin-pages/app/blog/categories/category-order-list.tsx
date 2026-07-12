'use client'

import { useState } from 'react'
import type { blogCategoryRow } from 'api-types'
import { updateBlogCategoryOrderAction } from '../actions'
import { SubmitButton } from '@/components/submit-button'

// カテゴリの表示順をドラッグ&ドロップ（と↑↓ボタン）で並べ替えるリスト。
// 並び順は hidden input（order_{id} = index）として送信し、既存のアクションで一括保存する
export function CategoryOrderList({ categories }: { categories: blogCategoryRow[] }) {
  const [items, setItems] = useState(categories.map((c) => ({ id: c.id, name: c.name })))
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length || from === to) {
      return
    }
    setItems((prev) => {
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next
    })
  }

  return (
    <form action={updateBlogCategoryOrderAction} className="space-y-3">
      <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
        {items.map((item, i) => (
          <li
            key={item.id}
            draggable
            onDragStart={() => setDragIndex(i)}
            onDragOver={(e) => {
              e.preventDefault()
              // ドラッグ中の行が別の行に重なったら、その位置へ移動してプレビューする
              if (dragIndex !== null && dragIndex !== i) {
                move(dragIndex, i)
                setDragIndex(i)
              }
            }}
            onDrop={(e) => e.preventDefault()}
            onDragEnd={() => setDragIndex(null)}
            className={`flex cursor-grab items-center gap-3 p-2 text-sm ${dragIndex === i ? 'bg-blue-50' : ''}`}
          >
            <input type="hidden" name={`order_${item.id}`} value={i} />
            <span aria-hidden="true" className="select-none text-gray-400">
              ⠿
            </span>
            <span className="w-6 text-right text-xs text-gray-400">{i + 1}</span>
            <span className="flex-1">{item.name}</span>
            <span className="font-mono text-xs text-gray-400">{item.id}</span>
            <span className="flex gap-1">
              <button
                type="button"
                onClick={() => move(i, i - 1)}
                disabled={i === 0}
                aria-label="上へ移動"
                className="rounded border border-gray-300 px-2 py-0.5 text-xs hover:bg-gray-100 disabled:opacity-30"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => move(i, i + 1)}
                disabled={i === items.length - 1}
                aria-label="下へ移動"
                className="rounded border border-gray-300 px-2 py-0.5 text-xs hover:bg-gray-100 disabled:opacity-30"
              >
                ↓
              </button>
            </span>
          </li>
        ))}
        {items.length === 0 && <li className="p-4 text-center text-sm text-gray-400">カテゴリがありません</li>}
      </ul>
      <SubmitButton pendingText="保存中...">この並び順で保存</SubmitButton>
      <p className="text-xs text-gray-400">ドラッグ&ドロップまたは↑↓ボタンで並べ替え、保存で確定します</p>
    </form>
  )
}

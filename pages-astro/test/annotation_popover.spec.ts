import { describe, expect, it } from 'vitest'
import { computePopoverPosition } from '@/lib/annotation_popover'

const viewport = { width: 400, height: 800 }
const popover = { width: 200, height: 60 }

describe('computePopoverPosition', () => {
  it('popover の左下をマーカーの左上に合わせ、4px 上に出す', () => {
    expect(computePopoverPosition({ top: 100, bottom: 116, left: 50 }, popover, viewport)).toEqual({
      top: 36,
      left: 50,
    })
  })

  it('右にはみ出すときは画面の右端から 8px 内側に寄せる', () => {
    expect(computePopoverPosition({ top: 100, bottom: 116, left: 300 }, popover, viewport)).toEqual({
      top: 36,
      left: 192,
    })
  })

  it('左端は画面の左端から 8px より内側にしない', () => {
    expect(computePopoverPosition({ top: 100, bottom: 116, left: 2 }, popover, viewport)).toEqual({
      top: 36,
      left: 8,
    })
  })

  it('上に収まらないときはマーカーの 4px 下に出す', () => {
    // 上に出すと 60 - 4 - 60 で画面の上端 8px より上になる
    expect(computePopoverPosition({ top: 60, bottom: 76, left: 50 }, popover, viewport)).toEqual({
      top: 80,
      left: 50,
    })
  })

  it('下にも収まらないときは画面の下端から 8px 内側に寄せる', () => {
    // 下に出すと 80 + 740 で画面の高さ 800 を超える
    expect(computePopoverPosition({ top: 60, bottom: 76, left: 50 }, { width: 200, height: 740 }, viewport)).toEqual({
      top: 52,
      left: 50,
    })
  })
})

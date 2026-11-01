import { describe, expect, it } from 'vitest'
import { computePopoverPosition } from '@/lib/annotation_popover'

const viewport = { width: 400, height: 800 }
const popover = { width: 200, height: 60 }

describe('computePopoverPosition', () => {
  it('マーカーの左端に揃えて 4px 下に出す', () => {
    expect(computePopoverPosition({ top: 100, bottom: 116, left: 50 }, popover, viewport)).toEqual({
      top: 120,
      left: 50,
    })
  })

  it('右にはみ出すときは画面の右端から 8px 内側に寄せる', () => {
    expect(computePopoverPosition({ top: 100, bottom: 116, left: 300 }, popover, viewport)).toEqual({
      top: 120,
      left: 192,
    })
  })

  it('左端は画面の左端から 8px より内側にしない', () => {
    expect(computePopoverPosition({ top: 100, bottom: 116, left: 2 }, popover, viewport)).toEqual({ top: 120, left: 8 })
  })

  it('下に収まらないときはマーカーの 4px 上に出す', () => {
    // 下に出すと 760 + 60 + 8 で画面の高さ 800 を超える
    expect(computePopoverPosition({ top: 740, bottom: 756, left: 50 }, popover, viewport)).toEqual({
      top: 676,
      left: 50,
    })
  })

  it('上にも収まらないときは画面の上端から 8px の位置にする', () => {
    expect(computePopoverPosition({ top: 790, bottom: 800, left: 50 }, { width: 200, height: 900 }, viewport)).toEqual({
      top: 8,
      left: 50,
    })
  })
})

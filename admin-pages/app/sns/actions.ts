'use server'

import { postTextToSNS } from '@/lib/sns'
import type { SNSPostActionState } from '@/lib/form-state'

export async function postSNSTextAction(_prev: SNSPostActionState, formData: FormData): Promise<SNSPostActionState> {
  const text = ((formData.get('text') as string | null) ?? '').trim()
  if (text === '') {
    return { error: '投稿する文面を入力してください' }
  }

  return await postTextToSNS(text)
}

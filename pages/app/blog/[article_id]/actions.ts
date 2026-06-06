'use server'

import { getSecretMeta } from '@/lib/api/workers'
import { secureEqual, setArticleUnlocked } from '@/lib/secret_unlock'
import { revalidatePath } from 'next/cache'

export type UnlockState = { ok: boolean; error?: string }

// 限定公開記事の閲覧コードを照合し、一致したら解錠 Cookie を発行する
// articleID / draftKey は呼び出し側で bind して渡す（useActionState のシグネチャに合わせる）
// 下書きプレビュー時は draftKey を渡さないと未公開記事の secret_code を取得できず照合に失敗する
export async function unlockSecretArticle(
  articleID: string,
  draftKey: string | undefined,
  _prevState: UnlockState,
  formData: FormData,
): Promise<UnlockState> {
  const input = (formData.get('secret_code') ?? '').toString()
  if (input === '') {
    return { ok: false, error: 'コードを入力してください' }
  }

  const meta = await getSecretMeta(articleID, draftKey)
  if (!meta.is_secret || meta.secret_code == null || meta.secret_code === '') {
    // 限定公開でない、またはコード未設定（誤設定）の場合は解錠しない
    return { ok: false, error: '認証できませんでした' }
  }

  if (!(await secureEqual(input, meta.secret_code))) {
    return { ok: false, error: 'コードが違います' }
  }

  await setArticleUnlocked(articleID, meta.secret_code)
  revalidatePath(`/blog/${articleID}`)
  return { ok: true }
}

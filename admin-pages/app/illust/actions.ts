'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { createAtelier, updateAtelier, getAtelier, createTag, type AtelierInput } from '@/lib/db'
import { purgeAtelierCache } from '@/lib/cache'
import { saveAtelierDraft } from '@/lib/draft'
import { generateContentID } from '@/lib/id'
import { parseContentFormat } from '@/lib/content-format'
import type { PreviewActionState } from '@/lib/form-state'

const VALID_STATUS = ['PUBLISH', 'DRAFT', 'CLOSED'] as const
const VALID_POSITION = ['center', 'top', 'bottom', 'left', 'right']

function parseAtelierForm(formData: FormData): { input: AtelierInput; error?: string } {
  const id = (formData.get('id') as string | null)?.trim() || generateContentID()
  const title = (formData.get('title') as string | null)?.trim() ?? ''
  const src = (formData.get('src') as string | null)?.trim() ?? ''
  const objectPosition = (formData.get('object_position') as string | null) ?? 'center'
  const description = (formData.get('description') as string | null) ?? ''
  const status = (formData.get('status') as string | null) ?? 'DRAFT'
  const tagIDs = formData.getAll('tag_ids').map((v) => String(v))

  const input: AtelierInput = {
    id,
    title,
    src,
    object_position: VALID_POSITION.includes(objectPosition) ? objectPosition : 'center',
    description,
    description_format: parseContentFormat(formData.get('description_format') as string | null),
    status: VALID_STATUS.includes(status as (typeof VALID_STATUS)[number])
      ? (status as AtelierInput['status'])
      : 'DRAFT',
    tagIDs,
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    return { input, error: 'IDは英数字・ハイフン・アンダースコアのみ使用できます' }
  }
  if (title === '' || src === '') {
    return { input, error: 'タイトルと画像URLは必須です' }
  }
  return { input }
}

export async function createAtelierAction(formData: FormData): Promise<void> {
  const { input, error } = parseAtelierForm(formData)
  if (error) {
    redirect(`/illust/new?error=${encodeURIComponent(error)}`)
  }
  if (await getAtelier(input.id)) {
    redirect(`/illust/new?error=${encodeURIComponent(`ID '${input.id}' は既に使用されています`)}`)
  }

  await createAtelier(input)
  await purgeAtelierCache()

  revalidatePath('/illust')
  redirect('/illust')
}

export async function updateAtelierAction(formData: FormData): Promise<void> {
  const { input, error } = parseAtelierForm(formData)
  if (error) {
    redirect(`/illust/${input.id}/edit?error=${encodeURIComponent(error)}`)
  }

  await updateAtelier(input)
  await purgeAtelierCache()

  revalidatePath('/illust')
  redirect('/illust')
}

// 編集中の内容をKVに保存し、pages本体のプレビューURLを返す（D1には書き込まない）
// ページ遷移させず結果を useActionState で返す（遷移すると編集中の本文が消えるため）
export async function previewAtelierAction(
  _prev: PreviewActionState,
  formData: FormData
): Promise<PreviewActionState> {
  const { input, error } = parseAtelierForm(formData)
  if (error) {
    return { error }
  }

  const draftKey = await saveAtelierDraft(input)
  const { env } = await getCloudflareContext({ async: true })
  return { previewURL: `${env.PAGES_HOST}/illust/detail/${input.id}?draftKey=${draftKey}` }
}

export async function createTagAction(formData: FormData): Promise<void> {
  const id = (formData.get('id') as string | null)?.trim() || generateContentID()
  const tag = (formData.get('tag') as string | null)?.trim() ?? ''
  const type = (formData.get('type') as string | null)?.trim() ?? ''

  if (tag === '' || type === '') {
    redirect(`/illust/tags?error=${encodeURIComponent('タグ名と種別は必須です')}`)
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    redirect(`/illust/tags?error=${encodeURIComponent('IDは英数字・ハイフン・アンダースコアのみ使用できます')}`)
  }

  await createTag({ id, tag, type })

  revalidatePath('/illust/tags')
  redirect('/illust/tags')
}

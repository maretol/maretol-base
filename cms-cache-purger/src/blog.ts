import { Content, WebhookPayload } from 'api-types'
import { deleteCacheByPrefix, deleteCache } from './kv'
import { Env } from './index'
import { generateContentKey, generateInfoKey, generateStaticDataKey, generateTagsKey } from 'cms-cache-key-gen'

export default class Blog {
  private prefix = 'contents_'
  constructor(private env: Env, private ctx: ExecutionContext) {}

  public async purgeCache(bodyJSON: WebhookPayload): Promise<Response> {
    if (bodyJSON.api === 'contents') {
      if (bodyJSON.type === 'new') {
        await this.newContent(bodyJSON)
      } else if (bodyJSON.type === 'edit') {
        await this.editContent(bodyJSON)
      } else if (bodyJSON.type === 'delete') {
        await this.deleteContentCache(bodyJSON)
      }
    } else if (bodyJSON.api === 'info') {
      // infoのキャッシュを削除する
      const cacheKey = generateInfoKey()
      await deleteCache(this.env, cacheKey)
    } else if (bodyJSON.api === 'categories') {
      // categoryのキャッシュを削除する
      const cacheKey = generateTagsKey()
      await deleteCache(this.env, cacheKey)
    } else if (bodyJSON.api === 'static') {
      // staticのキャッシュを削除する
      const cacheKey = generateStaticDataKey()
      await deleteCache(this.env, cacheKey)
    }
    return new Response('OK', { status: 200 })
  }

  private async newContent(bodyJSON: WebhookPayload) {
    // ブログのメインコンテンツに新規作成があった場合
    // contentsのキャッシュを削除する
    if (bodyJSON.contents.new.status.includes('PUBLISH')) {
      console.log('start deleteContentsCache')
      await deleteCacheByPrefix(this.env, this.prefix)
    } else {
      console.log('status is not PUBLISH')
    }
  }

  private async editContent(bodyJSON: WebhookPayload) {
    // 編集時は対象IDの単体キャッシュは常に削除する
    console.log('start deleteContentCache')
    console.log('id: ' + bodyJSON.id)
    const cacheKey = generateContentKey(bodyJSON.id)
    await deleteCache(this.env, cacheKey)

    // 下書き→公開、または限定公開フラグ(is_secret)の変更時は
    // 記事の一覧表示有無が変わるため一覧キャッシュ(contents_*)も削除する
    if (
      this.isDraftToPublish(bodyJSON.contents.old, bodyJSON.contents.new) ||
      this.isSecretChanged(bodyJSON.contents.old, bodyJSON.contents.new)
    ) {
      console.log('start deleteContentsCache')
      await deleteCacheByPrefix(this.env, this.prefix)
    }
  }

  private async deleteContentCache(bodyJSON: WebhookPayload) {
    // ブログのメインコンテンツに削除があった場合
    // contentsのキャッシュと対象のIDのコンテンツのキャッシュを削除する
    console.log('start deleteContentsCache')
    await deleteCacheByPrefix(this.env, this.prefix)
    console.log('start deleteContentCache')
    console.log('id: ' + bodyJSON.id)
    const cacheKey = generateContentKey(bodyJSON.id)
    await deleteCache(this.env, cacheKey)
  }

  private isDraftToPublish(oldContent: any, newContent: any): boolean {
    return oldContent.status.includes('DRAFT') && newContent.status.includes('PUBLISH')
  }

  // 限定公開フラグ(is_secret)が変更されたか（公開値ベースで比較）
  // 未設定は false 扱い。old が無い場合は変更なしとみなす
  private isSecretChanged(oldContent: Content | null, newContent: Content): boolean {
    if (oldContent === null) {
      return false
    }
    const oldSecret = oldContent.publishValue?.is_secret ?? false
    const newSecret = newContent.publishValue?.is_secret ?? false
    return oldSecret !== newSecret
  }
}

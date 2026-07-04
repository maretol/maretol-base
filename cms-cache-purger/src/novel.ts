import { WebhookPayload } from 'api-types'
import { deleteCache, deleteCacheByPrefix } from './kv'
import { Env } from '.'
import { generateNovelContentKey, generateNovelBodyKey } from 'cms-cache-key-gen'

export default class Novel {
  private prefix = 'novel_'
  constructor(private env: Env, private ctx: ExecutionContext) {}

  public async purgeCache(bodyJSON: WebhookPayload): Promise<Response> {
    if (bodyJSON.api === 'novel') {
      if (bodyJSON.type === 'new') {
        await this.newContent(bodyJSON)
      } else if (bodyJSON.type === 'edit') {
        await this.editContent(bodyJSON)
      } else if (bodyJSON.type === 'delete') {
        await this.deleteContent(bodyJSON)
      }
    }
    return new Response('OK', { status: 200 })
  }

  private async newContent(bodyJSON: WebhookPayload) {
    // 小説のメインコンテンツに新規作成があった場合
    // 一覧（および同一 prefix の本文・個別メタ）キャッシュを削除する
    if (bodyJSON.contents.new.status.includes('PUBLISH')) {
      console.log('start deleteContentsCache in novel')
      await deleteCacheByPrefix(this.env, this.prefix)
    } else {
      console.log('status is not PUBLISH')
    }
  }

  private async editContent(bodyJSON: WebhookPayload) {
    if (this.isDraftToPublish(bodyJSON.contents.old, bodyJSON.contents.new)) {
      // 下書きから公開に変更された場合
      // 一覧（および同一 prefix の本文・個別メタ）キャッシュを削除する
      console.log('start deleteContentsCache in novel')
      await deleteCacheByPrefix(this.env, this.prefix)
    } else {
      // 小説のメインコンテンツに編集があった場合
      // 対象のIDの個別メタキャッシュと本文キャッシュを削除する
      console.log('start deleteContentCache in novel')
      console.log('id: ' + bodyJSON.id)
      await deleteCache(this.env, generateNovelContentKey(bodyJSON.id))
      await deleteCache(this.env, generateNovelBodyKey(bodyJSON.id))
    }
  }

  private async deleteContent(bodyJSON: WebhookPayload) {
    // 小説のメインコンテンツに削除があった場合
    // 対象のIDの個別メタキャッシュと本文キャッシュを削除する
    console.log('start deleteContentCache in novel')
    console.log('id: ' + bodyJSON.id)
    await deleteCache(this.env, generateNovelContentKey(bodyJSON.id))
    await deleteCache(this.env, generateNovelBodyKey(bodyJSON.id))

    // 小説のリストのキャッシュを削除する
    console.log('start deleteContentsCache in novel')
    await deleteCacheByPrefix(this.env, this.prefix)
  }

  private isDraftToPublish(oldContent: any, newContent: any): boolean {
    // 下書きから公開に変更されたかどうかを判定
    return oldContent.status.includes('DRAFT') && newContent.status.includes('PUBLISH')
  }
}

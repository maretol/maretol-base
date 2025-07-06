import { WebhookPayload } from 'api-types'
import { deleteCache, deleteCacheByPrefix } from './kv'
import { Env } from '.'
import { generateBandeDessineeContentKey } from 'cms-cache-key-gen'

export default class Comic {
  private prefix = 'bande_dessinee_'
  constructor(private env: Env, private ctx: ExecutionContext) {}

  public async purgeCache(bodyJSON: WebhookPayload): Promise<Response> {
    if (bodyJSON.api === 'bande-dessinee') {
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
    // マンガのメインコンテンツに新規作成があった場合
    // contentsのキャッシュを削除する
    if (bodyJSON.contents.new.status.includes('PUBLISH')) {
      console.log('start deleteContentsCache in comic')
      await deleteCacheByPrefix(this.env, this.prefix)
    } else {
      console.log('status is not PUBLISH')
    }
  }

  private async editContent(bodyJSON: WebhookPayload) {
    if (this.isDraftToPublish(bodyJSON.contents.old, bodyJSON.contents.new)) {
      // 下書きから公開に変更された場合
      // contentsのキャッシュを削除する
      console.log('start deleteContentsCache in comic')
      await deleteCacheByPrefix(this.env, this.prefix)
    } else {
      // マンガのメインコンテンツに編集があった場合
      // 対象のIDのコンテンツのキャッシュを削除する
      console.log('start deleteContentCache in comic')
      console.log('id: ' + bodyJSON.id)
      const cacheKey = generateBandeDessineeContentKey(bodyJSON.id)
      await deleteCache(this.env, cacheKey)
    }
  }

  private async deleteContent(bodyJSON: WebhookPayload) {
    // マンガのメインコンテンツに削除があった場合
    // 対象のIDのコンテンツのキャッシュを削除する
    console.log('start deleteContentCache in comic')
    console.log('id: ' + bodyJSON.id)
    const cacheKey = generateBandeDessineeContentKey(bodyJSON.id)
    await deleteCache(this.env, cacheKey)

    // マンガのリストのキャッシュを削除する
    console.log('start deleteContentsCache in comic')
    await deleteCacheByPrefix(this.env, this.prefix)
  }

  private isDraftToPublish(oldContent: any, newContent: any): boolean {
    // 下書きから公開に変更されたかどうかを判定
    return oldContent.status.includes('DRAFT') && newContent.status.includes('PUBLISH')
  }
}

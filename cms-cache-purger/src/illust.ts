import { WebhookPayload } from 'api-types'
import { deleteCacheByPrefix, deleteCache } from './kv'
import { Env } from '.'
import { generateAtelierContentKey, generateAtelierKey } from 'cms-cache-key-gen'

export default class Illust {
  private prefix = 'atelier_'
  constructor(private env: Env, private ctx: ExecutionContext) {}

  public async purgeCache(bodyJSON: WebhookPayload): Promise<Response> {
    if (bodyJSON.api === 'atelier') {
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
    // イラストのメインコンテンツに新規作成があった場合
    // contentsのキャッシュを削除する
    if (bodyJSON.contents.new.status.includes('PUBLISH')) {
      console.log('start deleteContentsCache in illust')
      await deleteCacheByPrefix(this.env, this.prefix)
    } else {
      console.log('status is not PUBLISH')
    }
  }

  private async editContent(bodyJSON: WebhookPayload) {
    if (this.isDraftToPublish(bodyJSON.contents.old, bodyJSON.contents.new)) {
      // 下書きから公開に変更された場合
      // contentsのキャッシュを削除する
      console.log('start deleteContentsCache in illust')
      await deleteCacheByPrefix(this.env, this.prefix)
    } else {
      // イラストのメインコンテンツに編集があった場合
      // 対象のIDのコンテンツのキャッシュを削除する
      console.log('start deleteContentCache in illust')
      console.log('id: ' + bodyJSON.id)
      const cacheKey = generateAtelierContentKey(bodyJSON.id)
      await deleteCache(this.env, cacheKey)
    }
  }

  private async deleteContent(bodyJSON: WebhookPayload) {
    // イラストのメインコンテンツに削除があった場合
    // 対象のIDのコンテンツのキャッシュを削除する
    console.log('start deleteContentCache in illust')
    console.log('id: ' + bodyJSON.id)
    const cacheKey = generateAtelierContentKey(bodyJSON.id)
    await deleteCache(this.env, cacheKey)

    // イラストのリストのキャッシュを削除する
    console.log('start deleteContentsCache in illust')
    await deleteCacheByPrefix(this.env, this.prefix)
  }

  private isDraftToPublish(oldContent: any, newContent: any): boolean {
    // 下書きから公開に変更されたかどうかを判定
    return oldContent.status.includes('DRAFT') && newContent.status.includes('PUBLISH')
  }
}

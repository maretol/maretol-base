import { WebhookPayload } from 'api-types'
import { deleteContentCache, deleteContentsCache, deleteCache } from './kv'
import { Env } from './index'
import { generateInfoKey, generateStaticDataKey, generateTagsKey } from 'cms-cache-key-gen'

export default class Blog {
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
      await deleteContentsCache(this.env)
    } else {
      console.log('status is not PUBLISH')
    }
  }

  private async editContent(bodyJSON: WebhookPayload) {
    if (this.isDraftToPublish(bodyJSON.contents.old, bodyJSON.contents.new)) {
      // 下書きから公開に変更された場合
      // contentsのキャッシュを削除する
      console.log('start deleteContentsCache')
      await deleteContentsCache(this.env)
    } else {
      // ブログのメインコンテンツに編集があった場合
      // 対象のIDのコンテンツのキャッシュを削除する
      console.log('start deleteContentCache')
      console.log('id: ' + bodyJSON.id)
      await deleteContentCache(this.env, bodyJSON.id)
    }
  }

  private async deleteContentCache(bodyJSON: WebhookPayload) {
    // ブログのメインコンテンツに削除があった場合
    // contentsのキャッシュと対象のIDのコンテンツのキャッシュを削除する
    console.log('start deleteContentsCache')
    await deleteContentsCache(this.env)
    console.log('start deleteContentCache')
    console.log('id: ' + bodyJSON.id)
    await deleteContentCache(this.env, bodyJSON.id)
  }

  private isDraftToPublish(oldContent: any, newContent: any): boolean {
    return oldContent.status.includes('DRAFT') && newContent.status.includes('PUBLISH')
  }
}

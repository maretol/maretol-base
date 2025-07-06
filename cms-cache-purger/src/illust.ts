import { WebhookPayload } from 'api-types'

export default class Illust {
  constructor(private env: Env, private ctx: ExecutionContext) {}

  public async purgeCache(bodyJSON: WebhookPayload): Promise<Response> {
    return new Response('OK', { status: 200 })
  }
}

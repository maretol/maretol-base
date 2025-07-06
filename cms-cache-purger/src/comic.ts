import { WebhookPayload } from 'api-types'

export default class Comic {
  constructor(private env: Env, private ctx: ExecutionContext) {}

  public async purgeCache(bodyJSON: WebhookPayload): Promise<Response> {
    if (bodyJSON.api === '') {
    }
    return new Response('OK', { status: 200 })
  }
}

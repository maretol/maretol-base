/// <reference path="../../../../cms-data-fetcher/types.d.ts" />
/// <reference path="../../../../ogp-data-fetcher/types.d.ts" />
import { env } from 'cloudflare:workers'

// wrangler types は Service Binding を Fetcher としか出力しないので、RPC メソッドの型はここで付ける
export function cmsRPC(): Service<CMSDataFetcher> {
  return env.CMS_RPC as unknown as Service<CMSDataFetcher>
}

export function ogpRPC(): Service<OGPDataFetcher> {
  return env.OGP_RPC as unknown as Service<OGPDataFetcher>
}

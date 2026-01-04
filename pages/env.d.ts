/// <reference path="../cms-data-fetcher/types.d.ts" />
/// <reference path="../ogp-data-fetcher/types.d.ts" />

interface CloudflareEnv {
  CMS_FETCHER: Fetcher
  OGP_FETCHER: Fetcher
  OGP_FETCHER_CACHE: KVNamespace
  CMS_CACHE: KVNamespace
  IMAGE_CACHE: KVNamespace
  CMS_FETCHER_API_KEY: string
  OGP_FETCHER_API_KEY: string
  HOST: string
  CMS_RPC: Service<CMSDataFetcher>
  OGP_RPC: Service<OGPDataFetcher>
  CLARITY_ID: SecretsStoreSecret
  ENV: string
  AXIOM_ENDPOINT: string
  AXIOM_APITOKEN: string
}

// 以下はローカル時に使う部分（特に支障はないのでそのまま読ませる）
interface CloudflareEnv {
  CMS_DEV: string
  OGP_DEV: string
}

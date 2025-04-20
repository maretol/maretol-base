interface CloudflareEnv {
  CMS_FETCHER: Fetcher
  OGP_FETCHER: Fetcher
  OGP_FETCHER_CACHE: KVNamespace
  CMS_CACHE: KVNamespace
  CMS_FETCHER_API_KEY: string
  OGP_FETCHER_API_KEY: string
  HOST: string
  CMS_RPC: Service<CMSDataFetcher>
  OGP_RPC: Service<OGPDataFetcher>
}

// 以下はローカル時に使う部分（特に支障はないのでそのまま読ませる）
interface CloudflareEnv {
  API_KEY: string
  CMS_API_KEY: string
  CMS_API_KEY_BD: string
}

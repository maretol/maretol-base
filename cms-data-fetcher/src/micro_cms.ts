import { createClient } from 'microcms-js-sdk'
import { bandeDessineeResult, categoryAPIResult, contentsAPIResult, infoAPIResult } from 'api-types'

// offset, limit の指定のみで記事コンテンツを取得するAPIアクセス
export async function getContents(apiKey: string, offset: number, limit: number) {
  if (apiKey === undefined) {
    throw new Error('API_KEY is undefined')
  }

  const client = createClient({
    serviceDomain: 'maretol-blog',
    apiKey: apiKey,
  })

  const response = await client
    .getList<contentsAPIResult>({
      endpoint: 'contents',
      queries: { offset: offset, limit: limit },
    })
    .then((res) => {
      return res
    })
    .catch((err) => {
      console.log(err)
    })

  if (response === undefined) {
    throw new Error('api access error')
  }
  const total = response.totalCount

  return { contents: response.contents, total: total }
}

// IDを指定して単独の記事コンテンツを取得するAPIアクセス
export async function getContent(apiKey: string, articleID: string, draftKey?: string) {
  if (apiKey === undefined) {
    throw new Error('API_KEY is undefined')
  }

  const client = createClient({
    serviceDomain: 'maretol-blog',
    apiKey: apiKey,
  })

  const response = await client
    .getList<contentsAPIResult>({
      endpoint: 'contents',
      queries: { ids: articleID, draftKey: draftKey },
    })
    .then((res) => {
      return res
    })
    .catch((err) => {
      console.log(err)
    })

  if (response === undefined) {
    throw new Error('api access error')
  }
  return response.contents[0]
}

// タグ一覧を取得するAPIアクセス
export async function getTags(apiKey: string) {
  if (apiKey === undefined) {
    throw new Error('API_KEY is undefined')
  }

  const client = createClient({
    serviceDomain: 'maretol-blog',
    apiKey: apiKey,
  })

  const response = await client
    .getList<categoryAPIResult>({
      endpoint: 'categories',
    })
    .then((res) => {
      return res
    })
    .catch((err) => {
      console.log(err)
    })

  if (response === undefined) {
    throw new Error('api access error')
  }
  return response.contents
}

// タグ指定で記事コンテンツを取得するAPIアクセス
export async function getContentsByTag(apiKey: string, tagIDs: string[], offset: number, limit: number) {
  if (apiKey === undefined) {
    throw new Error('API_KEY is undefined')
  }

  if (tagIDs.length === 0) {
    return { contents: [], total: 0 }
  }

  const client = createClient({
    serviceDomain: 'maretol-blog',
    apiKey: apiKey,
  })

  const filters = tagIDs.map((id) => `categories[contains]${id}`)

  const response = await client
    .getList<contentsAPIResult>({
      endpoint: 'contents',
      queries: {
        filters: `${filters.join('[and]')}`,
        offset: offset,
        limit: limit,
      },
    })
    .then((res) => {
      return res
    })
    .catch((err) => {
      console.log(err)
    })

  if (response === undefined) {
    throw new Error('api access error')
  }
  return { contents: response.contents, total: response.totalCount }
}

export async function getInfo(apiKey: string) {
  if (apiKey === undefined) {
    throw new Error('API_KEY is undefined')
  }

  const client = createClient({
    serviceDomain: 'maretol-blog',
    apiKey: apiKey,
  })

  const response = await client
    .getList<infoAPIResult>({
      endpoint: 'info',
    })
    .then((res) => {
      return res
    })
    .catch((err) => {
      console.log(err)
    })

  if (response === undefined) {
    throw new Error('api access error')
  }

  return response.contents
}

export async function getBandeDessinees(apiKey: string, offset: number, limit: number) {
  if (apiKey === undefined) {
    throw new Error('API_KEY is undefined')
  }

  console.log('method point1')
  const client = createClient({
    serviceDomain: 'maretol-comic',
    apiKey: apiKey,
  })

  console.log('method point2')
  const response = await client
    .getList<bandeDessineeResult>({
      endpoint: 'bande-dessinee',
      queries: { offset: offset, limit: limit },
    })
    .then((res) => {
      return res
    })
    .catch((err) => {
      console.log(err)
    })

  console.log(response)

  console.log('method point3')
  if (response === undefined) {
    throw new Error('api access error')
  }

  console.log('method point4')
  return { bandeDessinees: response.contents, total: response.totalCount }
}

export async function getBandeDessinee(apiKey: string, contentID: string, draftKey?: string) {
  if (apiKey === undefined) {
    throw new Error('API_KEY is undefined')
  }

  const client = createClient({
    serviceDomain: 'maretol-comic',
    apiKey: apiKey,
  })

  const response = await client
    .getList<bandeDessineeResult>({
      endpoint: 'bande-dessinee',
      queries: { ids: contentID, draftKey: draftKey },
    })
    .then((res) => {
      return res
    })
    .catch((err) => {
      console.log(err)
    })

  if (response === undefined) {
    throw new Error('api access error')
  }

  return response.contents[0]
}

import { createClient, MicroCMSContentId, MicroCMSDate } from 'microcms-js-sdk'
import { bandeDessineeResult, categoryAPIResult, contentsAPIResult, staticAPIResult, infoAPIResult } from 'api-types'

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
  const contents = response.contents.map((c) => {
    return parseContentsAPIResult(c)
  })
  const total = response.totalCount

  return { contents, total }
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
  return parseContentsAPIResult(response.contents[0])
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

  const categories = response.contents.map((c) => {
    return parseCategoryAPIResult(c)
  })
  return categories
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

  const contents = response.contents.map((c) => {
    return parseContentsAPIResult(c)
  })
  const total = response.totalCount

  return { contents, total }
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

  return response.contents.map((i) => {
    return parseInfoResult(i)
  })
}

export async function getStatic(apiKey: string) {
  if (apiKey === undefined) {
    throw new Error('API_KEY is undefined')
  }

  const client = createClient({
    serviceDomain: 'maretol-blog',
    apiKey: apiKey,
  })

  const response = await client
    .get<staticAPIResult>({
      endpoint: 'static',
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

  return response as staticAPIResult
}

export async function getBandeDessinees(apiKey: string, offset: number, limit: number) {
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

  const bandeDessinees = response.contents.map((bd) => {
    return parseBandeDessineeResult(bd)
  })
  const total = response.totalCount

  return { bandeDessinees, total }
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

  return parseBandeDessineeResult(response.contents[0])
}

function parseInfoResult(result: infoAPIResult & MicroCMSContentId & MicroCMSDate): infoAPIResult {
  result = result as infoAPIResult
  return {
    id: result.id,
    createdAt: result.createdAt,
    updatedAt: result.updatedAt,
    publishedAt: result.publishedAt,
    revisedAt: result.revisedAt,
    page_pathname: result.page_pathname,
    title: result.title,
    main_text: result.main_text,
    parsed_content: result.parsed_content,
    table_of_contents: result.table_of_contents,
  }
}

function parseContentsAPIResult(result: contentsAPIResult & MicroCMSContentId & MicroCMSDate): contentsAPIResult {
  result = result as contentsAPIResult
  return {
    id: result.id,
    createdAt: result.createdAt,
    updatedAt: result.updatedAt,
    publishedAt: result.publishedAt,
    revisedAt: result.revisedAt,
    title: result.title,
    content: result.content,
    parsed_content: result.parsed_content,
    table_of_contents: result.table_of_contents,
    ogp_image: result.ogp_image,
    categories: result.categories,
  }
}

function parseCategoryAPIResult(result: categoryAPIResult & MicroCMSContentId & MicroCMSDate): categoryAPIResult {
  result = result as categoryAPIResult
  return {
    id: result.id,
    createdAt: result.createdAt,
    updatedAt: result.updatedAt,
    publishedAt: result.publishedAt,
    revisedAt: result.revisedAt,
    name: result.name,
  }
}
function parseBandeDessineeResult(result: bandeDessineeResult & MicroCMSContentId & MicroCMSDate): bandeDessineeResult {
  result = result as bandeDessineeResult
  return {
    id: result.id,
    createdAt: result.createdAt,
    updatedAt: result.updatedAt,
    publishedAt: result.publishedAt,
    title_name: result.title_name,
    publish_date: result.publish_date,
    publish_event: result.publish_event,
    contents_url: result.contents_url,
    description: result.description,
    next_id: result.next_id,
    previous_id: result.previous_id,
    series: result.series,
    tag: result.tag,
    cover: result.cover,
    back_cover: result.back_cover,
    format: result.format,
    filename: result.filename,
    first_page: result.first_page,
    last_page: result.last_page,
    first_left_right: result.first_left_right,
    parsed_description: result.parsed_description,
    table_of_contents: result.table_of_contents,
  }
}

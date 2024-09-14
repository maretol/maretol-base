interface ENV {
  CMS_FETCHER: Fetcher
  OGP_FETCHER: Fetcher
}

export const onRequest: PagesFunction<ENV> = async (context) => {
  const url = new URL(context.request.url)

  console.log('onRequest :', url.pathname)
  if (url.pathname.startsWith('/api/hello-world')) {
    const value = 'Hello, function Woker!'
    return new Response(value)
  } else if (url.pathname.startsWith('/api/cms')) {
    const res = await context.env.CMS_FETCHER.fetch(context.request)
    return Response.json(res.body, res)
  } else if (url.pathname.startsWith('/api/ogp')) {
    const res = await context.env.OGP_FETCHER.fetch(context.request)
    return Response.json(res.body, res)
  }

  return new Response('Not Found but this is worker response', { status: 200 })
}

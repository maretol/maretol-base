export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const hexNpubByDamus =
    '409c5539d20822f463e0e6297e217d5752109cdbdcebc21e2724075f72610245'
  const nostrJSON = {
    names: {
      Maretol: hexNpubByDamus,
    },
  }

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Max-Age': '86400',
  }

  return Response.json(nostrJSON, {
    headers: { ...corsHeaders },
  })
}

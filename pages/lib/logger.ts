export default async function sendLog(logObj: Object, endpoint: string, apiToken: string) {
  if (!endpoint || !apiToken) {
    console.error('axiom config is error!')
    return
  }

  const body = '[' + JSON.stringify(logObj) + ']'

  await fetch(endpoint, {
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    method: 'POST',
    body,
  })
}

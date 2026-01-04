export default async function sendLog(logObj: Object, endpoint: string, apiToken: string) {
  if (!endpoint || !apiToken) {
    console.error('Axiom config is error or invalid')
    return
  }

  const body = '[' + JSON.stringify(logObj) + ']'

  const response = await fetch(endpoint, {
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    method: 'POST',
    body,
  })

  if (!response.ok) {
    const responseText = await response.text()
    console.error('Error sending logdata', {
      status: response.status,
      statusText: response.statusText,
      body: responseText,
    })
  }
}

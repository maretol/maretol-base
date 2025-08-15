type MisskeyAuthInfo = {
  apiToken: string
}

async function NoteMisskey(authInfo: MisskeyAuthInfo, note: string): Promise<void> {
  const endpoint = 'https://misskey.io/api/notes/create'
  const body = {
    text: note,
    visibility: 'public',
  }
  const headers = new Headers()
  headers.set('Authorization', `Bearer ${authInfo.apiToken}`)
  headers.set('Content-Type', 'application/json')

  const response = await fetch(endpoint, { body: JSON.stringify(body), method: 'POST', headers })

  if (!response.ok) {
    console.error(`Error: ${response.status} ${response.statusText}`)
    const errorText = await response.text()
    console.error(errorText)
    throw new Error(`Misskey API request failed: ${errorText}`)
  }

  console.log(await response.text())
  return
}

export default NoteMisskey

export { MisskeyAuthInfo }

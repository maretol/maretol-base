// 外部 API への 1 リクエストの上限（ミリ秒）
// 応答しないホストがあっても、その SNS だけが失敗して残りの SNS は投稿できるようにする（issue #1320）
export const requestTimeoutMs = 8000

export function requestTimeout(): AbortSignal {
  return AbortSignal.timeout(requestTimeoutMs)
}

// fetch に requestTimeout を付ける。呼び出し側の signal があれば両方で中断する
export const fetchWithTimeout: typeof fetch = (input, init) => {
  const signal = init?.signal ? AbortSignal.any([init.signal, requestTimeout()]) : requestTimeout()
  return fetch(input, { ...init, signal })
}

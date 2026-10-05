// レート制限のキーにする、送信元の IP アドレス。
// IPv6 は利用者に /64 の範囲が割り当てられ、その中ではアドレスを自由に変えられるので、/64 の単位にまとめる
// （アドレスごとに数えると、アドレスを変えるだけで制限を回避できる）。IPv4 はそのまま使う
export function ipRateLimitKey(ip: string): string {
  // IPv4 と、IPv4 を埋め込んだ表記（::ffff:192.0.2.1 など）はそのまま
  if (!ip.includes(':') || ip.includes('.')) {
    return ip
  }
  // `::` で省略された 0 を補って 8 個のグループに展開し、先頭の 4 個（上位 64 ビット）を使う
  const parts = ip.toLowerCase().split('::')
  const [headGroups, tailGroups = []] = parts.map((part) => (part === '' ? [] : part.split(':')))
  const omitted = parts.length === 2 ? 8 - headGroups.length - tailGroups.length : 0
  const groups = [...headGroups, ...Array<string>(Math.max(omitted, 0)).fill('0'), ...tailGroups]
  // IPv6 として読めない値はそのまま
  if (parts.length > 2 || groups.length !== 8 || groups.some((group) => !/^[0-9a-f]{1,4}$/.test(group))) {
    return ip
  }
  const prefix = groups.slice(0, 4).map((group) => parseInt(group, 16).toString(16))
  return `${prefix.join(':')}::/64`
}

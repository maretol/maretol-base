function isPage(page: string | string[] | undefined): boolean {
  if (page === undefined) {
    return false
  }
  if (typeof page === 'string') {
    // page が数字であれば true
    return !isNaN(Number(page))
  }
  return false
}

export { isPage }

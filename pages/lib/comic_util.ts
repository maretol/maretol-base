function getFirstPage(filename: string, firstPageNumber: number, format: string) {
  const strPageNumber = firstPageNumber.toString()
  const formattedPageNumber = strPageNumber.padStart(3, '0')
  const firstPageFileName = `${filename}_${formattedPageNumber}.${format}`
  return firstPageFileName
}

export { getFirstPage }

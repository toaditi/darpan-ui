export function downloadTextFile(filename: string, text: string, contentType = 'text/plain'): void {
  const blob = new Blob([text], { type: contentType || 'text/plain' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')

  anchor.href = url
  anchor.download = filename
  anchor.click()

  URL.revokeObjectURL(url)
}

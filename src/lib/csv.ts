function normalizeHeaderValue(rawValue: string): string {
  return rawValue.replace(/^\uFEFF/, '').trim()
}

export function parseCsvHeaderRow(csvText: string): string[] {
  const source = csvText ?? ''
  const headers: string[] = []
  let current = ''
  let inQuotes = false

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index]

    if (char === '"') {
      if (inQuotes && source[index + 1] === '"') {
        current += '"'
        index += 1
        continue
      }
      inQuotes = !inQuotes
      continue
    }

    if (!inQuotes && char === ',') {
      headers.push(normalizeHeaderValue(current))
      current = ''
      continue
    }

    if (!inQuotes && (char === '\n' || char === '\r')) {
      headers.push(normalizeHeaderValue(current))
      if (char === '\r' && source[index + 1] === '\n') index += 1
      return headers
    }

    current += char
  }

  headers.push(normalizeHeaderValue(current))
  return headers
}

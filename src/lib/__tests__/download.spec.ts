import { afterEach, describe, expect, it, vi } from 'vitest'
import { downloadTextFile } from '../utils/download'

describe('download utilities', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('creates a text file download and releases the object URL', () => {
    const createObjectUrl = vi.fn(() => 'blob:test-url')
    const revokeObjectUrl = vi.fn()
    const click = vi.fn()
    const createElement = vi.spyOn(document, 'createElement')

    createElement.mockImplementation((tagName: string) => {
      const element = document.createElementNS('http://www.w3.org/1999/xhtml', tagName) as HTMLElement
      if (tagName === 'a') {
        Object.defineProperty(element, 'click', { value: click })
      }
      return element
    })
    vi.stubGlobal('URL', {
      createObjectURL: createObjectUrl,
      revokeObjectURL: revokeObjectUrl,
    })

    downloadTextFile('schema.json', '{"ok":true}', 'application/json')

    expect(createObjectUrl).toHaveBeenCalledWith(expect.any(Blob))
    expect(click).toHaveBeenCalledTimes(1)
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:test-url')
  })
})

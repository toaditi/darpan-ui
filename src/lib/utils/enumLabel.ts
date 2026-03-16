export interface EnumLike {
  enumCode?: string
  description?: string
  enumId?: string
}

export function enumLabel(item: EnumLike): string {
  return item.enumCode?.trim() || item.description?.trim() || item.enumId?.trim() || ''
}

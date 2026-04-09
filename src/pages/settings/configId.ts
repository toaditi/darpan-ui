export const CONFIG_ID_MAX_LENGTH = 20

export function exceedsConfigIdMaxLength(value: string): boolean {
  return value.trim().length > CONFIG_ID_MAX_LENGTH
}

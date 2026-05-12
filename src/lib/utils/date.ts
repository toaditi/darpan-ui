export interface FormatDateTimeOptions {
  fallback?: string
  locale?: Intl.LocalesArgument
  timeZone?: string
}

export function formatDateTime(value: unknown, options: FormatDateTimeOptions = {}): string {
  const fallback = options.fallback ?? '-'
  let parsedDate: Date

  if (typeof value === 'string') {
    if (!value.trim()) return fallback
    parsedDate = new Date(value)
    if (Number.isNaN(parsedDate.getTime())) return value
  } else if (typeof value === 'number') {
    if (!Number.isFinite(value)) return fallback
    parsedDate = new Date(value)
    if (Number.isNaN(parsedDate.getTime())) return fallback
  } else if (value instanceof Date) {
    parsedDate = value
    if (Number.isNaN(parsedDate.getTime())) return fallback
  } else {
    return fallback
  }

  return new Intl.DateTimeFormat(options.locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: options.timeZone?.trim() || undefined,
  }).format(parsedDate)
}

export function formatSavedResultDateTime(value: unknown): string {
  return formatDateTime(value, { fallback: 'Saved result' })
}

export interface CalendarCell {
  key: string
  date: Date
  day: number
  isCurrentMonth: boolean
}

export interface CalendarMonth {
  key: string
  label: string
  cells: CalendarCell[]
}

export function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function addDays(date: Date, dayCount: number): Date {
  const nextDate = new Date(date)
  nextDate.setDate(nextDate.getDate() + dayCount)
  return nextDate
}

export function addMonths(date: Date, monthCount: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + monthCount, 1)
}

export function formatDateInputValue(date: Date): string {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseDateInput(value: string): Date | null {
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null

  const year = Number(match[1])
  const monthIndex = Number(match[2]) - 1
  const day = Number(match[3])
  const date = new Date(year, monthIndex, day)
  if (date.getFullYear() !== year || date.getMonth() !== monthIndex || date.getDate() !== day) return null
  return date
}

export function formatMonthLabel(date: Date): string {
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(date)
}

export function buildCalendarMonth(monthDate: Date): CalendarMonth {
  const monthStart = startOfMonth(monthDate)
  const firstCellDate = addDays(monthStart, -monthStart.getDay())
  const cells: CalendarCell[] = Array.from({ length: 42 }, (_, index) => {
    const date = addDays(firstCellDate, index)
    return {
      key: formatDateInputValue(date),
      date,
      day: date.getDate(),
      isCurrentMonth: date.getMonth() === monthStart.getMonth() && date.getFullYear() === monthStart.getFullYear(),
    }
  })

  return {
    key: formatDateInputValue(monthStart),
    label: formatMonthLabel(monthStart),
    cells,
  }
}

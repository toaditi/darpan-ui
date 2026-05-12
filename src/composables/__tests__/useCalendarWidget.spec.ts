import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useCalendarWidget } from '../useCalendarWidget'
import { buildCalendarMonth, formatDateInputValue, parseDateInput } from '../../lib/utils/date'

describe('useCalendarWidget', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 4, 11))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders two months by default with the prior month visible first', () => {
    const calendar = useCalendarWidget()
    expect(calendar.calendarMonths.value).toHaveLength(2)
    expect(calendar.calendarMonths.value[0]!.label).toBe('April 2026')
    expect(calendar.calendarMonths.value[1]!.label).toBe('May 2026')
  })

  it('starts a selection on the start side then moves to end side', () => {
    const calendar = useCalendarWidget()
    const aprilMonth = calendar.calendarMonths.value[0]!
    const tenth = aprilMonth.cells.find((cell) => cell.isCurrentMonth && cell.day === 10)!
    const twelfth = aprilMonth.cells.find((cell) => cell.isCurrentMonth && cell.day === 12)!

    calendar.selectCell(tenth)
    expect(calendar.startDate.value).toBe('2026-04-10')
    expect(calendar.endDate.value).toBe('')
    expect(calendar.selecting.value).toBe('end')

    calendar.selectCell(twelfth)
    expect(calendar.endDate.value).toBe('2026-04-12')
    expect(calendar.range.value).not.toBeNull()
    expect(calendar.range.value?.startDate.getDate()).toBe(10)
    expect(calendar.range.value?.endExclusiveDate.getDate()).toBe(13)
  })

  it('disables future dates and the cell-disabled helper agrees', () => {
    const calendar = useCalendarWidget()
    const mayMonth = calendar.calendarMonths.value[1]!
    const future = mayMonth.cells.find((cell) => cell.isCurrentMonth && cell.day === 31)!
    expect(calendar.isCellDisabled(future)).toBe(true)

    calendar.selectCell(future)
    expect(calendar.startDate.value).toBe('')
  })

  it('refuses to shift past the most recent allowed month', () => {
    const calendar = useCalendarWidget()
    expect(calendar.canShiftMonth(1)).toBe(false)
    calendar.shiftMonth(1)
    expect(calendar.calendarMonths.value[0]!.label).toBe('April 2026')
  })

  it('emits onRangeConfirmed when both dates land', () => {
    const confirmed = vi.fn()
    const calendar = useCalendarWidget({ onRangeConfirmed: confirmed })
    const aprilMonth = calendar.calendarMonths.value[0]!
    const first = aprilMonth.cells.find((cell) => cell.isCurrentMonth && cell.day === 5)!
    const second = aprilMonth.cells.find((cell) => cell.isCurrentMonth && cell.day === 9)!
    calendar.selectCell(first)
    calendar.selectCell(second)
    expect(confirmed).toHaveBeenCalledTimes(1)
  })
})

describe('date utility helpers', () => {
  it('parseDateInput round-trips with formatDateInputValue', () => {
    const date = parseDateInput('2026-04-15')
    expect(date).not.toBeNull()
    expect(formatDateInputValue(date!)).toBe('2026-04-15')
  })

  it('buildCalendarMonth produces 42 cells for any month', () => {
    const month = buildCalendarMonth(new Date(2026, 4, 1))
    expect(month.cells).toHaveLength(42)
    expect(month.label).toBe('May 2026')
  })

  it('rejects invalid date strings', () => {
    expect(parseDateInput('not-a-date')).toBeNull()
    expect(parseDateInput('2026-02-30')).toBeNull()
  })
})

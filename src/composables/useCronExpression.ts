import { ref, type Ref } from 'vue'

export type SchedulePreset = 'hourly' | 'daily' | 'weekly' | 'monthly' | 'custom'

export interface CronWeekdayOption {
  value: string
  label: string
}

export const SCHEDULE_WEEKDAY_OPTIONS: readonly CronWeekdayOption[] = [
  { value: 'MON', label: 'Monday' },
  { value: 'TUE', label: 'Tuesday' },
  { value: 'WED', label: 'Wednesday' },
  { value: 'THU', label: 'Thursday' },
  { value: 'FRI', label: 'Friday' },
  { value: 'SAT', label: 'Saturday' },
  { value: 'SUN', label: 'Sunday' },
]

export interface UseCronExpression {
  schedulePreset: Ref<SchedulePreset>
  scheduleExpr: Ref<string>
  scheduleTime: Ref<string>
  scheduleMinute: Ref<number>
  scheduleWeekday: Ref<string>
  scheduleMonthDay: Ref<number>
  buildCronExpression: () => string
  syncFromExpression: (expression: string | undefined) => void
}

function clampScheduleNumber(value: unknown, min: number, max: number, fallback: number): number {
  const numericValue = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numericValue)) return fallback
  return Math.min(Math.max(Math.trunc(numericValue), min), max)
}

function parseScheduleTimeParts(value: string): { hour: number; minute: number } {
  const match = value.match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return { hour: 6, minute: 0 }
  return {
    hour: clampScheduleNumber(match[1], 0, 23, 6),
    minute: clampScheduleNumber(match[2], 0, 59, 0),
  }
}

export function useCronExpression(): UseCronExpression {
  const schedulePreset = ref<SchedulePreset>('daily')
  const scheduleExpr = ref('')
  const scheduleTime = ref('06:00')
  const scheduleMinute = ref(0)
  const scheduleWeekday = ref('MON')
  const scheduleMonthDay = ref(1)

  function buildCronExpression(): string {
    if (schedulePreset.value === 'custom') return scheduleExpr.value.trim()

    if (schedulePreset.value === 'hourly') {
      return `0 ${clampScheduleNumber(scheduleMinute.value, 0, 59, 0)} * * * ?`
    }

    const { hour, minute } = parseScheduleTimeParts(scheduleTime.value)
    if (schedulePreset.value === 'weekly') {
      return `0 ${minute} ${hour} ? * ${scheduleWeekday.value}`
    }
    if (schedulePreset.value === 'monthly') {
      return `0 ${minute} ${hour} ${clampScheduleNumber(scheduleMonthDay.value, 1, 31, 1)} * ?`
    }
    return `0 ${minute} ${hour} * * ?`
  }

  function syncFromExpression(expression: string | undefined): void {
    const normalizedExpression = expression?.trim()
    if (!normalizedExpression) {
      schedulePreset.value = 'daily'
      return
    }

    const parts = normalizedExpression.split(/\s+/)
    if (parts.length !== 6 || parts[0] !== '0') {
      schedulePreset.value = 'custom'
      return
    }

    const minute = Number(parts[1])
    const hour = Number(parts[2])
    if (!Number.isInteger(minute) || minute < 0 || minute > 59) {
      schedulePreset.value = 'custom'
      return
    }

    if (parts[2] === '*' && parts[3] === '*' && parts[4] === '*' && parts[5] === '?') {
      scheduleMinute.value = minute
      schedulePreset.value = 'hourly'
      return
    }

    if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
      schedulePreset.value = 'custom'
      return
    }

    scheduleTime.value = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
    if (parts[3] === '*' && parts[4] === '*' && parts[5] === '?') {
      schedulePreset.value = 'daily'
      return
    }

    const weekdayPart = parts[5] ?? ''
    if (parts[3] === '?' && parts[4] === '*' && SCHEDULE_WEEKDAY_OPTIONS.some((weekday) => weekday.value === weekdayPart)) {
      scheduleWeekday.value = weekdayPart
      schedulePreset.value = 'weekly'
      return
    }

    const monthDay = Number(parts[3])
    if (Number.isInteger(monthDay) && monthDay >= 1 && monthDay <= 31 && parts[4] === '*' && parts[5] === '?') {
      scheduleMonthDay.value = monthDay
      schedulePreset.value = 'monthly'
      return
    }

    schedulePreset.value = 'custom'
  }

  return {
    schedulePreset,
    scheduleExpr,
    scheduleTime,
    scheduleMinute,
    scheduleWeekday,
    scheduleMonthDay,
    buildCronExpression,
    syncFromExpression,
  }
}

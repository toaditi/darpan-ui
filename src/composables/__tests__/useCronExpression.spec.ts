import { describe, expect, it } from 'vitest'
import { useCronExpression } from '../useCronExpression'

describe('useCronExpression', () => {
  it('builds a daily cron at the configured time', () => {
    const cron = useCronExpression()
    cron.schedulePreset.value = 'daily'
    cron.scheduleTime.value = '09:30'
    expect(cron.buildCronExpression()).toBe('0 30 9 * * ?')
  })

  it('builds an hourly cron with the configured minute', () => {
    const cron = useCronExpression()
    cron.schedulePreset.value = 'hourly'
    cron.scheduleMinute.value = 15
    expect(cron.buildCronExpression()).toBe('0 15 * * * ?')
  })

  it('builds a weekly cron with the configured weekday and time', () => {
    const cron = useCronExpression()
    cron.schedulePreset.value = 'weekly'
    cron.scheduleTime.value = '06:00'
    cron.scheduleWeekday.value = 'WED'
    expect(cron.buildCronExpression()).toBe('0 0 6 ? * WED')
  })

  it('builds a monthly cron with the configured day and time', () => {
    const cron = useCronExpression()
    cron.schedulePreset.value = 'monthly'
    cron.scheduleTime.value = '12:00'
    cron.scheduleMonthDay.value = 15
    expect(cron.buildCronExpression()).toBe('0 0 12 15 * ?')
  })

  it('returns the trimmed custom expression when preset is custom', () => {
    const cron = useCronExpression()
    cron.schedulePreset.value = 'custom'
    cron.scheduleExpr.value = '  0 0 1 1 * ?  '
    expect(cron.buildCronExpression()).toBe('0 0 1 1 * ?')
  })

  it('clamps invalid minute values when building hourly expressions', () => {
    const cron = useCronExpression()
    cron.schedulePreset.value = 'hourly'
    cron.scheduleMinute.value = 999
    expect(cron.buildCronExpression()).toBe('0 59 * * * ?')
  })

  it('syncs from a daily cron expression', () => {
    const cron = useCronExpression()
    cron.syncFromExpression('0 30 9 * * ?')
    expect(cron.schedulePreset.value).toBe('daily')
    expect(cron.scheduleTime.value).toBe('09:30')
  })

  it('syncs from a weekly cron expression', () => {
    const cron = useCronExpression()
    cron.syncFromExpression('0 0 6 ? * MON')
    expect(cron.schedulePreset.value).toBe('weekly')
    expect(cron.scheduleWeekday.value).toBe('MON')
  })

  it('syncs from a monthly cron expression', () => {
    const cron = useCronExpression()
    cron.syncFromExpression('0 0 12 5 * ?')
    expect(cron.schedulePreset.value).toBe('monthly')
    expect(cron.scheduleMonthDay.value).toBe(5)
  })

  it('falls back to custom for unrecognized cron shapes', () => {
    const cron = useCronExpression()
    cron.syncFromExpression('* * * * * *')
    expect(cron.schedulePreset.value).toBe('custom')
  })

  it('defaults to daily for empty input', () => {
    const cron = useCronExpression()
    cron.schedulePreset.value = 'monthly'
    cron.syncFromExpression('')
    expect(cron.schedulePreset.value).toBe('daily')
  })
})

const timeFormatter = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' })
const dayFormatter = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' })
const dayWithYearFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

const DAY_MS = 24 * 60 * 60 * 1000

export function formatTime(timestamp: number): string {
  return timeFormatter.format(new Date(timestamp))
}

export function dayKey(timestamp: number): string {
  const date = new Date(timestamp)
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function formatDayLabel(timestamp: number): string {
  const now = Date.now()

  if (dayKey(timestamp) === dayKey(now)) return 'Сегодня'
  if (dayKey(timestamp) === dayKey(now - DAY_MS)) return 'Вчера'

  const date = new Date(timestamp)
  return (date.getFullYear() === new Date(now).getFullYear() ? dayFormatter : dayWithYearFormatter).format(date)
}

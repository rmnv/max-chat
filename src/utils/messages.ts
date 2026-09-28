import type { Message } from '../model'
import { dayKey } from './date'

export interface DayGroup {
  day: string
  messages: Message[]
}

export function groupByDay(messages: Message[]): DayGroup[] {
  const groups: DayGroup[] = []

  for (const message of messages) {
    const day = dayKey(message.timestamp)
    const lastGroup = groups[groups.length - 1]

    if (lastGroup?.day === day) {
      lastGroup.messages.push(message)
    } else {
      groups.push({ day, messages: [message] })
    }
  }

  return groups
}

import type { InstanceState, NotificationBody, OutgoingMessageStatus } from './types'
import type { MessageStatus } from '../model'

export type { MessageStatus }

export type ChatEvent =
  | {
      kind: 'incoming-text'
      remoteId: string
      chatId: string
      chatTitle?: string
      phone?: string
      text: string
      timestamp: number
      isGroup: boolean
    }
  | {
      kind: 'outgoing-text'
      remoteId: string
      chatId: string
      text: string
      timestamp: number
    }
  | {
      kind: 'outgoing-status'
      remoteId: string
      chatId: string
      status: MessageStatus
      error?: string
    }
  | { kind: 'instance-state'; state: InstanceState }
  | { kind: 'quota-exceeded' }
  | { kind: 'ignored' }

const STATUS_TEXT: Record<string, MessageStatus> = {
  delivered: 'delivered',
  read: 'read',
  clear: 'delivered',
  failed: 'failed',
  noAccount: 'failed',
  notInGroup: 'failed',
}

const STATUS_ERRORS: Record<string, string> = {
  failed: 'Сообщение не отправлено',
  noAccount: 'У получателя нет аккаунта MAX',
  notInGroup: 'Инстанс не состоит в групповом чате',
}

export function parseWebhook(body: NotificationBody): ChatEvent {
  const timestamp = toTimestamp(body.timestamp)

  switch (body.typeWebhook) {
    case 'incomingMessageReceived': {
      const text = body.messageData?.textMessageData?.textMessage
      const chatId = body.senderData?.chatId

      if (!text || !chatId) return { kind: 'ignored' }

      const phone = body.senderData?.senderPhoneNumber

      return {
        kind: 'incoming-text',
        remoteId: body.idMessage ?? `${chatId}:${timestamp}`,
        chatId,
        chatTitle: body.senderData?.chatName || body.senderData?.senderName || undefined,
        phone: phone ? String(phone) : undefined,
        text,
        timestamp,
        isGroup: body.senderData?.chatType === 'group',
      }
    }

    case 'outgoingMessageReceived':
    case 'outgoingAPIMessageReceived': {
      const text = body.messageData?.textMessageData?.textMessage
      const chatId = body.chatId ?? body.senderData?.chatId

      if (!text || !chatId || !body.idMessage) return { kind: 'ignored' }

      return {
        kind: 'outgoing-text',
        remoteId: body.idMessage,
        chatId,
        text,
        timestamp,
      }
    }

    case 'outgoingMessageStatus': {
      const status = body.status as OutgoingMessageStatus | undefined
      const chatId = body.chatId

      if (!body.idMessage || !chatId || !status || !STATUS_TEXT[status]) return { kind: 'ignored' }

      return {
        kind: 'outgoing-status',
        remoteId: body.idMessage,
        chatId,
        status: STATUS_TEXT[status],
        error: body.description || STATUS_ERRORS[status],
      }
    }

    case 'stateInstanceChanged': {
      const state = readState(body)
      return state ? { kind: 'instance-state', state } : { kind: 'ignored' }
    }

    case 'quotaExceeded':
      return { kind: 'quota-exceeded' }

    default:
      return { kind: 'ignored' }
  }
}

function readState(body: NotificationBody): InstanceState | null {
  const record = body as unknown as Record<string, unknown>

  for (const key of ['stateInstance', 'state', 'typeInstanceState']) {
    const value = record[key]
    if (typeof value === 'string' && value !== '') return value as InstanceState
  }

  return null
}

function toTimestamp(seconds: number | undefined): number {
  if (!seconds || !Number.isFinite(seconds)) return Date.now()
  return seconds < 1e11 ? seconds * 1000 : seconds
}

import { describe, expect, it } from 'vitest'

import { parseWebhook } from './webhooks'
import type { NotificationBody } from './types'

const incomingText: NotificationBody = {
  typeWebhook: 'incomingMessageReceived',
  instanceData: { idInstance: 3100000000, wid: '79991234567@c.us', typeInstance: 'v3' },
  timestamp: 1763115112,
  idMessage: '1763115112345',
  senderData: {
    chatId: '10000000',
    chatName: 'Ходабрыш Пробешёлов',
    chatType: 'user',
    sender: '10000000',
    senderName: 'Ходабрыш Пробешёлов',
    senderType: 'user',
    senderPhoneNumber: 79876543210,
  },
  messageData: {
    typeMessage: 'textMessage',
    textMessageData: { textMessage: 'Привет!' },
  },
}

describe('parseWebhook: входящие сообщения', () => {
  it('разбирает входящее текстовое сообщение', () => {
    expect(parseWebhook(incomingText)).toEqual({
      kind: 'incoming-text',
      remoteId: '1763115112345',
      chatId: '10000000',
      chatTitle: 'Ходабрыш Пробешёлов',
      phone: '79876543210',
      text: 'Привет!',
      timestamp: 1763115112000,
      isGroup: false,
    })
  })

  it('игнорирует уведомления о файлах и опросах', () => {
    const withFile: NotificationBody = {
      ...incomingText,
      messageData: { typeMessage: 'imageMessage' },
    }

    expect(parseWebhook(withFile)).toEqual({ kind: 'ignored' })
  })

  it('подставляет время получения, если в уведомлении его нет', () => {
    const before = Date.now()
    const event = parseWebhook({ ...incomingText, timestamp: undefined as unknown as number })

    expect(event.kind).toBe('incoming-text')
    expect(event.kind === 'incoming-text' && event.timestamp).toBeGreaterThanOrEqual(before)
  })
})

describe('parseWebhook: исходящие сообщения', () => {
  it('разбирает статус прочтения', () => {
    expect(
      parseWebhook({
        typeWebhook: 'outgoingMessageStatus',
        chatId: '10000000',
        timestamp: 1755591519,
        idMessage: '115054445839974415',
        status: 'read',
      }),
    ).toEqual({
      kind: 'outgoing-status',
      remoteId: '115054445839974415',
      chatId: '10000000',
      status: 'read',
      error: undefined,
    })
  })

  it('превращает статус noAccount в ошибку с понятным текстом', () => {
    const event = parseWebhook({
      typeWebhook: 'outgoingMessageStatus',
      chatId: '10000000',
      timestamp: 1755591519,
      idMessage: '1',
      status: 'noAccount',
    })

    expect(event).toMatchObject({ status: 'failed', error: 'У получателя нет аккаунта MAX' })
  })

  it('использует описание ошибки из GREEN-API', () => {
    const event = parseWebhook({
      typeWebhook: 'outgoingMessageStatus',
      chatId: '10000000',
      timestamp: 1755591519,
      idMessage: '1',
      status: 'failed',
      description: 'Сообщение не доставлено',
    })

    expect(event).toMatchObject({ error: 'Сообщение не доставлено' })
  })

  it('трактует статус clear как снятие отметки о прочтении', () => {
    const event = parseWebhook({
      typeWebhook: 'outgoingMessageStatus',
      chatId: '10000000',
      timestamp: 1755591519,
      idMessage: '1',
      status: 'clear',
    })

    expect(event).toMatchObject({ status: 'delivered' })
  })

  it('разбирает эхо сообщения, отправленного с телефона', () => {
    expect(
      parseWebhook({
        typeWebhook: 'outgoingMessageReceived',
        chatId: '10000000',
        timestamp: 1755591519,
        idMessage: '2',
        messageData: { typeMessage: 'textMessage', textMessageData: { textMessage: 'С телефона' } },
      }),
    ).toMatchObject({ kind: 'outgoing-text', remoteId: '2', text: 'С телефона' })
  })
})

describe('parseWebhook: служебные уведомления', () => {
  it('разбирает изменение состояния инстанса', () => {
    const event = parseWebhook({
      typeWebhook: 'stateInstanceChanged',
      timestamp: 1755591519,
      stateInstance: 'authorized',
    } as unknown as NotificationBody)

    expect(event).toEqual({ kind: 'instance-state', state: 'authorized' })
  })

  it('разбирает превышение ограничений тарифа', () => {
    expect(parseWebhook({ typeWebhook: 'quotaExceeded', timestamp: 1 })).toEqual({
      kind: 'quota-exceeded',
    })
  })

  it('игнорирует неизвестные типы уведомлений', () => {
    expect(parseWebhook({ typeWebhook: 'outgoingAPIMessageReceived', timestamp: 1 })).toEqual({
      kind: 'ignored',
    })
  })
})

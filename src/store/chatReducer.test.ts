import { describe, expect, it } from 'vitest'

import type { ChatEvent } from '../api/webhooks'
import type { Message } from '../model'
import { emptyHistory } from '../model'
import { chatReducer } from './chatReducer'

const incoming: ChatEvent = {
  kind: 'incoming-text',
  remoteId: 'AAA',
  chatId: '10000000',
  chatTitle: '+7 (999) 123-45-67',
  phone: '79991234567',
  text: 'Привет',
  timestamp: 1_700_000_000_000,
  isGroup: false,
}

const optimisticMessage: Message = {
  localId: 'local-1',
  chatId: '10000000',
  direction: 'outgoing',
  text: 'Ответ',
  timestamp: 1_700_000_001_000,
  status: 'pending',
}

describe('chatReducer: входящие сообщения', () => {
  it('добавляет чат и сообщение', () => {
    const state = chatReducer(emptyHistory, { type: 'event', event: incoming, activeChatId: null })

    expect(state.chats).toHaveLength(1)
    expect(state.chats[0]).toMatchObject({ chatId: '10000000', phone: '79991234567', unread: 1 })
    expect(state.messages).toHaveLength(1)
    expect(state.messages[0]).toMatchObject({ text: 'Привет', direction: 'incoming' })
  })

  it('не увеличивает счётчик непрочитанных для открытого чата', () => {
    const state = chatReducer(emptyHistory, {
      type: 'event',
      event: incoming,
      activeChatId: '10000000',
    })

    expect(state.chats[0]!.unread).toBe(0)
  })

  it('не добавляет то же уведомление повторно', () => {
    const first = chatReducer(emptyHistory, { type: 'event', event: incoming, activeChatId: null })
    const second = chatReducer(first, { type: 'event', event: incoming, activeChatId: null })

    expect(second.messages).toHaveLength(1)
    expect(second.chats[0]!.unread).toBe(1)
  })

  it('не затирает уже известное имя чата, если в уведомлении его нет', () => {
    const withName = chatReducer(emptyHistory, {
      type: 'event',
      event: { ...incoming, chatTitle: 'Анна', phone: undefined },
      activeChatId: null,
    })
    const later = chatReducer(withName, {
      type: 'event',
      event: { ...incoming, remoteId: 'BBB', chatTitle: undefined, phone: undefined },
      activeChatId: null,
    })

    expect(later.chats[0]!.title).toBe('Анна')
    expect(later.messages).toHaveLength(2)
  })

  it('не создаёт дубль чата, когда в него уже писали', () => {
    const received = chatReducer(emptyHistory, { type: 'event', event: incoming, activeChatId: null })
    const replied = chatReducer(received, {
      type: 'add-outgoing',
      message: optimisticMessage,
    })
    const answered = chatReducer(replied, {
      type: 'event',
      event: { ...incoming, remoteId: 'DDD', timestamp: 1_900_000_000_000 },
      activeChatId: '10000000',
    })

    expect(answered.chats).toHaveLength(1)
    expect(new Set(answered.chats.map((chat) => chat.chatId)).size).toBe(answered.chats.length)
    expect(answered.messages).toHaveLength(3)
  })

  it('ставит свежий чат в начало списка', () => {
    const first = chatReducer(emptyHistory, { type: 'event', event: incoming, activeChatId: null })
    const second = chatReducer(first, {
      type: 'event',
      event: { ...incoming, remoteId: 'CCC', chatId: '20000000', timestamp: 1_800_000_000_000 },
      activeChatId: null,
    })

    expect(second.chats.map((chat) => chat.chatId)).toEqual(['20000000', '10000000'])
  })
})

describe('chatReducer: отправка сообщений', () => {
  it('добавляет сообщение оптимистично и подтверждает отправку', () => {
    const added = chatReducer(emptyHistory, { type: 'add-outgoing', message: optimisticMessage })
    expect(added.messages[0]!.status).toBe('pending')

    const sent = chatReducer(added, {
      type: 'message-sent',
      localId: 'local-1',
      remoteId: 'BBB',
    })

    expect(sent.messages[0]).toMatchObject({ status: 'sent', remoteId: 'BBB' })
  })

  it('помечает сообщение как неотправленное с текстом ошибки', () => {
    const added = chatReducer(emptyHistory, { type: 'add-outgoing', message: optimisticMessage })
    const failed = chatReducer(added, {
      type: 'message-failed',
      localId: 'local-1',
      error: 'Инстанс не авторизован',
    })

    expect(failed.messages[0]).toMatchObject({ status: 'failed', error: 'Инстанс не авторизован' })
  })

  it('не дублирует сообщение, если эхо уже пришло', () => {
    const added = chatReducer(emptyHistory, { type: 'add-outgoing', message: optimisticMessage })
    const withRemoteId = chatReducer(added, { type: 'message-sent', localId: 'local-1', remoteId: 'BBB' })
    const afterEcho = chatReducer(withRemoteId, {
      type: 'event',
      event: { kind: 'outgoing-text', remoteId: 'BBB', chatId: '10000000', text: 'Ответ', timestamp: 1 },
      activeChatId: null,
    })

    expect(afterEcho.messages).toHaveLength(1)
  })
})

describe('chatReducer: статусы сообщений', () => {
  const withSentMessage = () => {
    const added = chatReducer(emptyHistory, { type: 'add-outgoing', message: optimisticMessage })
    return chatReducer(added, { type: 'message-sent', localId: 'local-1', remoteId: 'BBB' })
  }

  it('обновляет статус по идентификатору сообщения', () => {
    const state = chatReducer(withSentMessage(), {
      type: 'event',
      event: { kind: 'outgoing-status', remoteId: 'BBB', chatId: '10000000', status: 'delivered' },
      activeChatId: null,
    })

    expect(state.messages[0]!.status).toBe('delivered')
  })

  it('не откатывает статус назад', () => {
    const read = chatReducer(withSentMessage(), {
      type: 'event',
      event: { kind: 'outgoing-status', remoteId: 'BBB', chatId: '10000000', status: 'read' },
      activeChatId: null,
    })
    const delivered = chatReducer(read, {
      type: 'event',
      event: { kind: 'outgoing-status', remoteId: 'BBB', chatId: '10000000', status: 'delivered' },
      activeChatId: null,
    })

    expect(delivered.messages[0]!.status).toBe('read')
  })
})

describe('chatReducer: работа со списком чатов', () => {
  it('создаёт чат по номеру телефона без непрочитанных', () => {
    const state = chatReducer(emptyHistory, {
      type: 'open-chat',
      chat: { chatId: '10000000', title: '+7 (999) 123-45-67', phone: '79991234567' },
    })

    expect(state.chats).toHaveLength(1)
    expect(state.chats[0]!.unread).toBe(0)
    expect(state.messages).toHaveLength(0)
  })

  it('не создаёт дубликат чата', () => {
    const first = chatReducer(emptyHistory, {
      type: 'open-chat',
      chat: { chatId: '10000000', title: '+7 (999) 123-45-67', phone: '79991234567' },
    })
    const second = chatReducer(first, {
      type: 'open-chat',
      chat: { chatId: '10000000', title: '+7 (999) 123-45-67', phone: '79991234567' },
    })

    expect(second.chats).toHaveLength(1)
  })

  it('снимает счётчик непрочитанных при открытии чата', () => {
    const withUnread = chatReducer(emptyHistory, { type: 'event', event: incoming, activeChatId: null })
    const read = chatReducer(withUnread, { type: 'activate', chatId: '10000000' })

    expect(read.chats[0]!.unread).toBe(0)
  })

  it('очищает историю', () => {
    const withUnread = chatReducer(emptyHistory, { type: 'event', event: incoming, activeChatId: null })
    expect(chatReducer(withUnread, { type: 'reset' })).toEqual({ chats: [], messages: [] })
  })
})

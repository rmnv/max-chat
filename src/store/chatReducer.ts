import type { ChatEvent } from '../api'
import type { Chat, ChatHistory, Message } from '../model'

type ChatAction =
  | { type: 'hydrate'; history: ChatHistory }
  | { type: 'activate'; chatId: string | null }
  | { type: 'open-chat'; chat: Pick<Chat, 'chatId' | 'title' | 'phone'> }
  | { type: 'event'; event: ChatEvent; activeChatId: string | null }
  | { type: 'add-outgoing'; message: Message }
  | { type: 'message-sent'; localId: string; remoteId: string }
  | { type: 'message-failed'; localId: string; error: string }
  | { type: 'reset' }

const MAX_MESSAGES = 500

export function chatReducer(state: ChatHistory, action: ChatAction): ChatHistory {
  switch (action.type) {
    case 'hydrate':
      return {
        chats: sortChats(action.history.chats ?? []),
        messages: action.history.messages ?? [],
      }

    case 'activate':
      return action.chatId ? { ...state, chats: markAsRead(state.chats, action.chatId) } : state

    case 'open-chat': {
      if (state.chats.some((chat) => chat.chatId === action.chat.chatId)) {
        return { ...state, chats: markAsRead(state.chats, action.chat.chatId) }
      }

      const chat: Chat = {
        chatId: action.chat.chatId,
        title: action.chat.title,
        phone: action.chat.phone,
        isGroup: false,
        lastActivity: Date.now(),
        unread: 0,
      }

      return { ...state, chats: sortChats([chat, ...state.chats]) }
    }

    case 'event':
      return applyEvent(state, action.event, action.activeChatId)

    case 'add-outgoing': {
      if (action.message.remoteId && hasRemoteId(state.messages, action.message.remoteId)) {
        return state
      }

      return {
        chats: mergeChat(state.chats, {
          chatId: action.message.chatId,
          lastActivity: action.message.timestamp,
        }),
        messages: trim([...state.messages, action.message]),
      }
    }

    case 'message-sent':
      return updateMessage(state, action.localId, (message) => ({
        ...message,
        remoteId: action.remoteId,
        status: 'sent',
        error: undefined,
      }))

    case 'message-failed':
      return updateMessage(state, action.localId, (message) => ({
        ...message,
        status: 'failed',
        error: action.error,
      }))

    case 'reset':
      return { chats: [], messages: [] }

    default:
      return state
  }
}

function applyEvent(state: ChatHistory, event: ChatEvent, activeChatId: string | null): ChatHistory {
  switch (event.kind) {
    case 'incoming-text':
    case 'outgoing-text': {
      if (hasRemoteId(state.messages, event.remoteId)) return state

      const incoming = event.kind === 'incoming-text'

      return {
        chats: mergeChat(state.chats, {
          chatId: event.chatId,
          title: incoming ? event.chatTitle : undefined,
          phone: incoming ? event.phone : undefined,
          isGroup: incoming ? event.isGroup : undefined,
          lastActivity: event.timestamp,
          unread: incoming && event.chatId !== activeChatId ? 1 : incoming ? 0 : undefined,
        }),
        messages: trim([
          ...state.messages,
          {
            localId: event.remoteId,
            remoteId: event.remoteId,
            chatId: event.chatId,
            direction: incoming ? 'incoming' : 'outgoing',
            text: event.text,
            timestamp: event.timestamp,
            status: incoming ? 'read' : 'sent',
          },
        ]),
      }
    }

    case 'outgoing-status':
      return {
        ...state,
        messages: state.messages.map((message) =>
          message.remoteId === event.remoteId && isNextStatus(message.status, event.status)
            ? { ...message, status: event.status, error: event.error }
            : message,
        ),
      }

    default:
      return state
  }
}

const STATUS_ORDER: Record<Message['status'], number> = {
  pending: 0,
  sent: 1,
  delivered: 2,
  read: 3,
  failed: 3,
}

function isNextStatus(current: Message['status'], next: Message['status']): boolean {
  return STATUS_ORDER[next] >= STATUS_ORDER[current]
}

function mergeChat(chats: Chat[], patch: Partial<Chat> & { chatId: string; unread?: number }): Chat[] {
  const index = chats.findIndex((chat) => chat.chatId === patch.chatId)

  if (index === -1) {
    const created: Chat = {
      chatId: patch.chatId,
      title: patch.title ?? patch.phone ?? patch.chatId,
      phone: patch.phone,
      isGroup: patch.isGroup ?? false,
      lastActivity: patch.lastActivity ?? Date.now(),
      unread: patch.unread ?? 0,
    }

    return sortChats([created, ...chats])
  }

  const existing = chats[index]!
  const next = [...chats]

  next[index] = {
    ...existing,
    title: patch.title ?? existing.title,
    phone: patch.phone ?? existing.phone,
    isGroup: patch.isGroup ?? existing.isGroup,
    lastActivity: patch.lastActivity ?? existing.lastActivity,
    unread: patch.unread ?? existing.unread,
  }

  return sortChats(next)
}

function updateMessage(
  state: ChatHistory,
  localId: string,
  update: (message: Message) => Message,
): ChatHistory {
  return {
    ...state,
    messages: state.messages.map((message) => (message.localId === localId ? update(message) : message)),
  }
}

function markAsRead(chats: Chat[], chatId: string): Chat[] {
  return chats.map((chat) => (chat.chatId === chatId ? { ...chat, unread: 0 } : chat))
}

function hasRemoteId(messages: Message[], remoteId: string): boolean {
  return messages.some((message) => message.remoteId === remoteId)
}

function sortChats(chats: Chat[]): Chat[] {
  return [...chats].sort((a, b) => b.lastActivity - a.lastActivity)
}

function trim(messages: Message[]): Message[] {
  return messages.length > MAX_MESSAGES ? messages.slice(messages.length - MAX_MESSAGES) : messages
}

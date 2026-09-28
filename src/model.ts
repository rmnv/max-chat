export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed'

export interface Chat {
  chatId: string
  title: string
  phone?: string
  isGroup: boolean
  lastActivity: number
  unread: number
}

export interface Message {
  localId: string
  remoteId?: string
  chatId: string
  direction: 'incoming' | 'outgoing'
  text: string
  timestamp: number
  status: MessageStatus
  error?: string
}

export interface ChatHistory {
  chats: Chat[]
  messages: Message[]
}

export const emptyHistory: ChatHistory = { chats: [], messages: [] }

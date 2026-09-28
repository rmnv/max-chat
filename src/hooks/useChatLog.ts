import { useCallback, useEffect, useMemo, useReducer, useState } from 'react'

import { chatReducer } from '../store/chatReducer'
import type { Chat, Message } from '../model'
import { historyKey, loadJSON, saveJSON } from '../utils/storage'

export function useChatLog(idInstance: string) {
  const [state, dispatch] = useReducer(chatReducer, idInstance, loadHistory)
  const [activeChatId, setActiveChatId] = useState<string | null>(null)

  useEffect(() => {
    saveJSON(historyKey(idInstance), state)
  }, [idInstance, state])

  const activate = useCallback((chatId: string | null) => {
    setActiveChatId(chatId)
    dispatch({ type: 'activate', chatId })
  }, [])

  const openChat = useCallback(
    (chat: Pick<Chat, 'chatId' | 'title' | 'phone'>) => {
      dispatch({ type: 'open-chat', chat })
      activate(chat.chatId)
    },
    [activate],
  )

  const activeChat = useMemo(
    () => state.chats.find((chat) => chat.chatId === activeChatId) ?? null,
    [state.chats, activeChatId],
  )

  const messages = useMemo(
    () =>
      state.messages
        .filter((message) => message.chatId === activeChatId)
        .sort((a, b) => a.timestamp - b.timestamp),
    [state.messages, activeChatId],
  )

  const lastMessageByChat = useMemo(() => {
    const latest = new Map<string, Message>()

    for (const message of state.messages) {
      const current = latest.get(message.chatId)
      if (!current || message.timestamp >= current.timestamp) {
        latest.set(message.chatId, message)
      }
    }

    return latest
  }, [state.messages])

  return {
    chats: state.chats,
    messages,
    lastMessageByChat,
    activeChat,
    activeChatId,
    activate,
    openChat,
    dispatch,
  }
}

function loadHistory(idInstance: string) {
  return loadJSON<ReturnType<typeof chatReducer>>(historyKey(idInstance)) ?? { chats: [], messages: [] }
}

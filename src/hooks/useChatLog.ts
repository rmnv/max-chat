import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'

import { chatReducer } from '../store/chatReducer'
import type { Chat, ChatHistory, Message } from '../model'
import { historyKey, loadJSON, saveJSON } from '../utils/storage'

const SAVE_DEBOUNCE_MS = 400

export function useChatLog(idInstance: string) {
  const [state, dispatch] = useReducer(chatReducer, idInstance, loadHistory)
  const [activeChatId, setActiveChatId] = useState<string | null>(null)

  const latestState = useRef(state)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    latestState.current = state

    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      saveTimer.current = null
      saveJSON(historyKey(idInstance), latestState.current)
    }, SAVE_DEBOUNCE_MS)

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [idInstance, state])

  useEffect(
    () => () => {
      if (!saveTimer.current) return
      clearTimeout(saveTimer.current)
      saveTimer.current = null
      saveJSON(historyKey(idInstance), latestState.current)
    },
    [idInstance],
  )

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

function loadHistory(idInstance: string): ChatHistory {
  return loadJSON<ChatHistory>(historyKey(idInstance)) ?? { chats: [], messages: [] }
}

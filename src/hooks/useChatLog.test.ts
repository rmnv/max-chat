import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { chatReducer } from '../store/chatReducer'
import type { ChatEvent } from '../api'
import { historyKey } from '../utils/storage'
import { useChatLog } from './useChatLog'

const ID = '3100000001'
const KEY = historyKey(ID)

const incoming: ChatEvent = {
  kind: 'incoming-text',
  remoteId: 'AAA',
  chatId: '10000000',
  chatTitle: '+7 (999) 123-45-67',
  text: 'Привет',
  timestamp: 1_700_000_000_000,
  isGroup: false,
}

beforeEach(() => {
  window.localStorage.clear()
  vi.useRealTimers()
})

describe('useChatLog: сохранение истории', () => {
  it('сворачивает серию изменений в одну запись', async () => {
    vi.useFakeTimers()

    const { result } = renderHook(() => useChatLog(ID))

    act(() => {
      for (let i = 0; i < 5; i++) {
        result.current.dispatch({ type: 'event', event: { ...incoming, remoteId: `M${i}` }, activeChatId: null })
      }
    })

    expect(window.localStorage.getItem(KEY)).toBeNull()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500)
    })

    const saved = JSON.parse(window.localStorage.getItem(KEY) ?? '{}')
    expect(saved.messages).toHaveLength(5)

    vi.useRealTimers()
  })

  it('сохраняет недописанное при размонтировании', () => {
    vi.useFakeTimers()

    const { result, unmount } = renderHook(() => useChatLog(ID))

    act(() => {
      result.current.dispatch({ type: 'event', event: incoming, activeChatId: null })
    })

    expect(window.localStorage.getItem(KEY)).toBeNull()

    act(() => {
      unmount()
    })

    const saved = JSON.parse(window.localStorage.getItem(KEY) ?? '{}')
    expect(saved.messages).toHaveLength(1)
    expect(saved.chats).toHaveLength(1)

    vi.useRealTimers()
  })

  it('подхватывает сохранённую историю при монтировании', () => {
    const { chats, messages } = chatReducer(
      { chats: [], messages: [] },
      { type: 'event', event: incoming, activeChatId: null },
    )
    window.localStorage.setItem(KEY, JSON.stringify({ chats, messages }))

    const { result } = renderHook(() => useChatLog(ID))

    expect(result.current.chats).toHaveLength(1)
    expect(result.current.messages).toHaveLength(0)

    act(() => {
      result.current.activate('10000000')
    })

    expect(result.current.messages).toHaveLength(1)
  })
})
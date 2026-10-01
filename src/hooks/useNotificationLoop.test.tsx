import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { GreenApiError } from '../api/errors'
import type { GreenApi } from '../api/greenApi'
import type { NotificationBody } from '../api/types'
import type { ChatEvent } from '../api/webhooks'
import { useNotificationLoop } from './useNotificationLoop'

const incoming: NotificationBody = {
  typeWebhook: 'incomingMessageReceived',
  timestamp: 1763115112,
  idMessage: 'AAA',
  senderData: { chatId: '10000000', sender: '10000000' },
  messageData: { typeMessage: 'textMessage', textMessageData: { textMessage: 'Привет' } },
}

function createFakeApi(responses: Array<() => Promise<{ receiptId: number; body: NotificationBody | null }>>) {
  let index = 0

  const receiveNotification = vi.fn(async (_options?: unknown) => {
    const next = responses[index]
    index += 1
    return next ? next() : new Promise<never>(() => {})
  })

  const deleteNotification = vi.fn(async (_receiptId?: number, _options?: unknown) => ({ result: true }))

  return {
    api: { receiveNotification, deleteNotification } as unknown as GreenApi,
    receiveNotification,
    deleteNotification,
  }
}

const immediate = (body: NotificationBody | null, receiptId: number) => () =>
  Promise.resolve({ receiptId, body })

describe('useNotificationLoop', () => {
  it('передаёт события по порядку и подтверждает каждое уведомление', async () => {
    const { api, receiveNotification, deleteNotification } = createFakeApi([
      immediate(incoming, 1),
      immediate({ ...incoming, idMessage: 'BBB', messageData: { typeMessage: 'textMessage', textMessageData: { textMessage: 'Ещё' } } }, 2),
    ])
    const onEvent = vi.fn<(event: ChatEvent) => void>()

    const { unmount } = renderHook(() => useNotificationLoop({ api, enabled: true, onEvent }))

    await waitFor(() => expect(deleteNotification).toHaveBeenCalledTimes(2))
    expect(receiveNotification.mock.calls[0]![0]).toHaveProperty('signal')

    expect(onEvent).toHaveBeenCalledTimes(2)
    expect(onEvent.mock.calls[0]![0]).toMatchObject({ kind: 'incoming-text', remoteId: 'AAA' })
    expect(onEvent.mock.calls[1]![0]).toMatchObject({ kind: 'incoming-text', remoteId: 'BBB' })

    expect(deleteNotification).toHaveBeenNthCalledWith(1, 1, expect.anything())
    expect(deleteNotification).toHaveBeenNthCalledWith(2, 2, expect.anything())

    unmount()
  })

  it('не запускает цикл, когда он выключен', () => {
    const { api, receiveNotification } = createFakeApi([immediate(incoming, 1)])
    const onEvent = vi.fn()

    const { result } = renderHook(() => useNotificationLoop({ api, enabled: false, onEvent }))

    expect(result.current.connection).toBe('idle')
    expect(receiveNotification).not.toHaveBeenCalled()
    expect(onEvent).not.toHaveBeenCalled()
  })

  it('показывает ошибку и повторяет запрос после сбоя', async () => {
    const { api, receiveNotification, deleteNotification } = createFakeApi([
      () => Promise.reject(new GreenApiError('Нет связи с GREEN-API.', 0)),
      immediate(incoming, 7),
    ])
    const onEvent = vi.fn()

    const { result, unmount } = renderHook(() => useNotificationLoop({ api, enabled: true, onEvent }))

    await waitFor(() => expect(result.current.connection).toBe('error'), { timeout: 3000 })
    expect(result.current.error).toMatch(/Нет связи/)

    await waitFor(() => expect(result.current.connection).toBe('online'), { timeout: 3000 })
    expect(receiveNotification).toHaveBeenCalledTimes(3)
    expect(onEvent).toHaveBeenCalledTimes(1)
    expect(deleteNotification).toHaveBeenCalledWith(7, expect.anything())

    unmount()
  })

  it('прекращает опрос при размонтировании', async () => {
    const { api, receiveNotification } = createFakeApi([immediate(incoming, 1)])
    const onEvent = vi.fn()

    const { unmount } = renderHook(() => useNotificationLoop({ api, enabled: true, onEvent }))
    await waitFor(() => expect(onEvent).toHaveBeenCalled())

    const callsBeforeUnmount = receiveNotification.mock.calls.length
    unmount()

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50))
    })

    expect(receiveNotification.mock.calls.length).toBe(callsBeforeUnmount)
  })
})

import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { GreenApiError } from '../api'
import type { InstanceSettings } from '../api'
import { useMaxChat } from './useMaxChat'

const credentials = {
  idInstance: '3100000001',
  apiTokenInstance: 'secret-token',
  apiUrl: 'https://api.green-api.com',
}

const settings: InstanceSettings = {
  wid: '79991234567@c.us',
  typeInstance: 'v3',
  webhookUrl: '',
  webhookUrlToken: '',
  delaySendMessagesMilliseconds: 0,
  markIncomingMessagesReaded: 'no',
  markIncomingMessagesReadedOnReply: 'no',
  outgoingWebhook: 'yes',
  outgoingMessageWebhook: 'yes',
  outgoingAPIMessageWebhook: 'yes',
  stateWebhook: 'yes',
  incomingWebhook: 'yes',
  editedMessageWebhook: 'no',
  deletedMessageWebhook: 'no',
  pollMessageWebhook: 'no',
  downloadUrlJpeg: 'no',
}

function json(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  } as unknown as Response
}

function createDeferredFetchMock() {
  const deferred: Array<() => void> = []
  let stateRequests = 0
  let settingsRequests = 0

  const fetchMock = vi.fn(async (url: string) => {
    if (url.includes('/getStateInstance/')) {
      stateRequests += 1
      await new Promise<void>((resolve) => deferred.push(resolve))
      return json({ stateInstance: 'authorized' })
    }

    if (url.includes('/getSettings/')) {
      settingsRequests += 1
      await new Promise<void>((resolve) => deferred.push(resolve))
      return json(settings)
    }

    return new Promise(() => {}) as unknown as Response
  })

  return {
    fetchMock,
    releaseAll: () => deferred.splice(0).forEach((resolve) => resolve()),
    get stateRequests() {
      return stateRequests
    },
    get settingsRequests() {
      return settingsRequests
    },
  }
}

describe('useMaxChat: стартовые запросы', () => {
  it('не дублирует запросы, пока предыдущий ещё выполняется', async () => {
    const api = createDeferredFetchMock()
    vi.stubGlobal('fetch', api.fetchMock)

    const { result } = renderHook(() => useMaxChat(credentials))

    const stateCalls = Promise.all([
      result.current.refreshInstanceState(),
      result.current.refreshInstanceState(),
      result.current.refreshInstanceState(),
    ])
    const settingsCalls = Promise.all([
      result.current.refreshSettings(),
      result.current.refreshSettings(),
    ])

    api.releaseAll()
    const [stateResults] = await Promise.all([stateCalls, settingsCalls])

    expect(api.stateRequests).toBe(1)
    expect(api.settingsRequests).toBe(1)
    expect(stateResults.every((result) => result.ok)).toBe(true)

    await waitFor(() => expect(result.current.isAuthorized).toBe(true))
    expect(result.current.instanceError).toBeNull()
    expect(result.current.settingsError).toBeNull()

    vi.unstubAllGlobals()
  })

  it('повторяет запрос после превышения лимита частоты', async () => {
    vi.useFakeTimers()

    try {
      let attempts = 0
      const fetchMock = vi.fn(async (url: string) => {
        if (url.includes('/getStateInstance/')) {
          attempts += 1
          if (attempts === 1) throw new GreenApiError('Превышен лимит частоты запросов.', 429)
          return json({ stateInstance: 'authorized' })
        }

        if (url.includes('/getSettings/')) return json(settings)

        return new Promise(() => {}) as unknown as Response
      })

      vi.stubGlobal('fetch', fetchMock)

      const { result } = renderHook(() => useMaxChat(credentials))
      const pending = result.current.refreshInstanceState()
      await vi.advanceTimersByTimeAsync(1_300)

      await expect(pending).resolves.toEqual({ ok: true })
      expect(attempts).toBe(2)

      vi.unstubAllGlobals()
    } finally {
      vi.useRealTimers()
    }
  })

  it('не повторяет запрос при отказе с кодом 403', async () => {
    let attempts = 0
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('/getStateInstance/')) {
        attempts += 1
        return json({ error: 'forbidden' }, 403)
      }

      if (url.includes('/getSettings/')) return json(settings)

      return new Promise(() => {}) as unknown as Response
    })

    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useMaxChat(credentials))
    const outcome = await result.current.refreshInstanceState()

    expect(outcome.ok).toBe(false)
    expect(attempts).toBe(1)
    await waitFor(() => expect(result.current.instanceError).toBe('forbidden'))

    vi.unstubAllGlobals()
  })

  it('снимает баннер после успешного повторного запроса', async () => {
    let attempts = 0
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('/getStateInstance/')) {
        attempts += 1
        if (attempts === 1) return json({ error: 'temporarily unavailable' }, 500)
        return json({ stateInstance: 'authorized' })
      }

      if (url.includes('/getSettings/')) return json(settings)

      return new Promise(() => {}) as unknown as Response
    })

    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useMaxChat(credentials))
    await result.current.refreshInstanceState()

    await result.current.refreshInstanceState()

    expect(attempts).toBe(2)
    await waitFor(() => expect(result.current.instanceError).toBeNull())
    await waitFor(() => expect(result.current.isAuthorized).toBe(true))

    vi.unstubAllGlobals()
  })
})

import { useEffect, useRef, useState } from 'react'

import { GreenApiError } from '../api'
import type { ChatEvent, GreenApi, NotificationBody } from '../api'
import { parseWebhook } from '../api'

export type ConnectionState = 'idle' | 'connecting' | 'online' | 'error'

export interface LoopStats {
  /** Сколько уведомлений успешно получено из очереди. */
  received: number
  /** Что пришло в последнем уведомлении, без разбора. */
  lastBody: NotificationBody | null
  /** Когда пришло последнее уведомление. */
  lastReceivedAt: number | null
  /** Время последней ошибки опроса. */
  lastErrorAt: number | null
}

const EMPTY_STATS: LoopStats = {
  received: 0,
  lastBody: null,
  lastReceivedAt: null,
  lastErrorAt: null,
}

interface Options {
  api: GreenApi
  enabled: boolean
  onEvent: (event: ChatEvent) => void
}

const MAX_BACKOFF_MS = 30_000

export function useNotificationLoop({ api, enabled, onEvent }: Options): {
  connection: ConnectionState
  error: string | null
  stats: LoopStats
} {
  const [status, setStatus] = useState<Exclude<ConnectionState, 'connecting'> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<LoopStats>(EMPTY_STATS)
  const [wasEnabled, setWasEnabled] = useState(enabled)

  const onEventRef = useRef(onEvent)
  useEffect(() => {
    onEventRef.current = onEvent
  })

  if (wasEnabled !== enabled) {
    setWasEnabled(enabled)
    setStatus(null)
    setError(null)
    setStats(EMPTY_STATS)
  }

  useEffect(() => {
    if (!enabled) return

    const controller = new AbortController()
    let stopped = false
    let failures = 0

    const loop = async () => {
      while (!stopped) {
        try {
          const { receiptId, body } = await api.receiveNotification({ signal: controller.signal })

          if (body) {
            try {
              onEventRef.current(parseWebhook(body))
            } finally {
              if (receiptId > 0) {
                await api.deleteNotification(receiptId, { signal: controller.signal })
              }
            }

            setStats((current) => ({
              ...current,
              received: current.received + 1,
              lastBody: body,
              lastReceivedAt: Date.now(),
            }))
          }

          failures = 0
          setStatus('online')
          setError(null)
        } catch (caught) {
          if (stopped || controller.signal.aborted) return

          failures += 1
          setStatus('error')
          setError(
            caught instanceof GreenApiError
              ? caught.message
              : 'Не удалось получить уведомления от GREEN-API.',
          )
          setStats((current) => ({ ...current, lastErrorAt: Date.now() }))

          await sleep(Math.min(MAX_BACKOFF_MS, 1000 * 2 ** (failures - 1)), controller.signal)
        }
      }
    }

    void loop()

    return () => {
      stopped = true
      controller.abort()
    }
  }, [api, enabled])

  return {
    connection: !enabled ? 'idle' : (status ?? 'connecting'),
    error: enabled ? error : null,
    stats,
  }
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) {
      resolve()
      return
    }

    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve()
    }, ms)

    function onAbort() {
      clearTimeout(timer)
      resolve()
    }

    signal.addEventListener('abort', onAbort, { once: true })
  })
}

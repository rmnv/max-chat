import { useCallback, useEffect, useMemo, useState } from 'react'

import { GreenApi, REQUIRED_SETTINGS } from '../api'
import type { ChatEvent, Credentials, InstanceSettings, InstanceState } from '../api'
import type { Message } from '../model'
import { formatPhone, normalizePhone } from '../utils/phone'

import { useChatLog } from './useChatLog'
import { useNotificationLoop } from './useNotificationLoop'

const STATE_REFRESH_MS = 60_000

export interface ActionResult {
  ok: boolean
  error?: string
}

/** Что мешает получать уведомления: недостающие настройки или занятый webhookUrl. */
export interface SettingsIssues {
  incomingOff: boolean
  outgoingOff: boolean
  webhookUrlSet: boolean
  /** Настроек хватает для работы. */
  ok: boolean
}

const NO_ISSUES: SettingsIssues = { incomingOff: false, outgoingOff: false, webhookUrlSet: false, ok: true }

export function useMaxChat(credentials: Credentials) {
  const api = useMemo(() => new GreenApi(credentials), [credentials])

  const [instanceState, setInstanceState] = useState<InstanceState | null>(null)
  const [instanceError, setInstanceError] = useState<string | null>(null)
  const [isCheckingState, setIsCheckingState] = useState(false)
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(false)
  const [settings, setSettings] = useState<InstanceSettings | null>(null)
  const [settingsError, setSettingsError] = useState<string | null>(null)
  const [isFixingSettings, setIsFixingSettings] = useState(false)
  const [settingsFixNote, setSettingsFixNote] = useState<string | null>(null)

  const { dispatch, activeChatId, openChat, ...log } = useChatLog(credentials.idInstance)

  const refreshInstanceState = useCallback(async (): Promise<ActionResult> => {
    setIsCheckingState(true)
    setInstanceError(null)

    try {
      const { stateInstance } = await api.getStateInstance()
      setInstanceState(stateInstance)
      return { ok: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось получить состояние инстанса.'
      setInstanceError(message)
      return { ok: false, error: message }
    } finally {
      setIsCheckingState(false)
    }
  }, [api])

  const refreshSettings = useCallback(async (): Promise<ActionResult> => {
    try {
      setSettings(await api.getSettings())
      setSettingsError(null)
      return { ok: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось прочитать настройки инстанса.'
      setSettingsError(message)
      return { ok: false, error: message }
    }
  }, [api])

  const fixSettings = useCallback(async (): Promise<ActionResult> => {
    setIsFixingSettings(true)
    setSettingsFixNote(null)

    try {
      await api.setSettings({ ...REQUIRED_SETTINGS })
      setSettingsFixNote(
        'Настройки отправлены. GREEN-API перезапускает инстанс и применяет их в течение 5 минут — пока идёт ожидание, входящие сообщения не появятся.',
      )
      await refreshSettings()
      return { ok: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось сохранить настройки.'
      setSettingsError(message)
      return { ok: false, error: message }
    } finally {
      setIsFixingSettings(false)
    }
  }, [api, refreshSettings])

  const handleEvent = useCallback(
    (event: ChatEvent) => {
      switch (event.kind) {
        case 'instance-state':
          setInstanceState(event.state)
          setInstanceError(null)
          break

        case 'quota-exceeded':
          setIsQuotaExceeded(true)
          break

        default:
          dispatch({ type: 'event', event, activeChatId })
      }
    },
    [dispatch, activeChatId],
  )

  const isAuthorized = instanceState === 'authorized'

  const issues: SettingsIssues = useMemo(() => {
    if (!settings) return NO_ISSUES

    const incomingOff = settings.incomingWebhook !== 'yes'
    const outgoingOff = settings.outgoingWebhook !== 'yes' || settings.outgoingMessageWebhook !== 'yes'
    const webhookUrlSet = settings.webhookUrl.trim() !== ''

    return { incomingOff, outgoingOff, webhookUrlSet, ok: !incomingOff && !outgoingOff && !webhookUrlSet }
  }, [settings])

  // Опрос не запускаем, пока настройки не прочитаны и не в порядке: иначе цикл
  // молча запрашивает пустую очередь и выглядит как «сообщения не приходят».
  const { connection, error: connectionError, stats } = useNotificationLoop({
    api,
    enabled: isAuthorized && issues.ok,
    onEvent: handleEvent,
  })

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect
    void refreshInstanceState()
    // oxlint-disable-next-line react/set-state-in-effect
    void refreshSettings()

    const timer = setInterval(() => void refreshInstanceState(), STATE_REFRESH_MS)

    return () => clearInterval(timer)
  }, [refreshInstanceState, refreshSettings])

  const sendMessage = useCallback(
    async (text: string): Promise<ActionResult> => {
      if (!activeChatId) return { ok: false, error: 'Сначала выберите чат.' }

      const trimmed = text.trim()
      if (!trimmed) return { ok: false, error: 'Введите текст сообщения.' }

      const message: Message = {
        localId: crypto.randomUUID(),
        chatId: activeChatId,
        direction: 'outgoing',
        text: trimmed,
        timestamp: Date.now(),
        status: 'pending',
      }

      dispatch({ type: 'add-outgoing', message })

      try {
        const { idMessage } = await api.sendMessage(activeChatId, trimmed)
        dispatch({ type: 'message-sent', localId: message.localId, remoteId: idMessage })
        return { ok: true }
      } catch (error) {
        const reason = error instanceof Error ? error.message : 'Сообщение не отправлено.'
        dispatch({ type: 'message-failed', localId: message.localId, error: reason })
        return { ok: false, error: reason }
      }
    },
    [api, activeChatId, dispatch],
  )

  const startChatWithPhone = useCallback(
    async (input: string): Promise<ActionResult> => {
      const parsed = normalizePhone(input)
      if (!parsed.ok) return { ok: false, error: parsed.error }

      try {
        const response = await api.checkAccount(parsed.digits)

        if (!('exist' in response)) {
          return { ok: false, error: response.reason }
        }

        if (!response.exist) {
          return {
            ok: false,
            error:
              'Аккаунт MAX с таким номером не найден. В MAX есть «безопасный режим»: номер может быть скрыт от поиска.',
          }
        }

        openChat({ chatId: response.chatId, title: formatPhone(parsed.digits), phone: parsed.digits })
        return { ok: true }
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : 'Не удалось проверить номер.' }
      }
    },
    [api, openChat],
  )

  return {
    ...log,
    activeChatId,
    instanceState,
    instanceError,
    isCheckingState,
    isQuotaExceeded,
    isAuthorized,
    connection,
    connectionError,
    stats,
    settings,
    settingsError,
    settingsIssues: issues,
    isFixingSettings,
    settingsFixNote,
    refreshSettings,
    fixSettings,
    refreshInstanceState,
    sendMessage,
    startChatWithPhone,
    dismissQuotaNotice: () => setIsQuotaExceeded(false),
  }
}

export type MaxChat = ReturnType<typeof useMaxChat>

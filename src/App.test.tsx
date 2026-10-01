import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from './App'
import type { NotificationBody } from './api/types'

interface SentMessage {
  chatId: string
  message: string
}

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  } as unknown as Response
}

function createGreenApiMock() {
  const queue: Array<{ receiptId: number; body: NotificationBody }> = []
  const waiting: Array<(value: unknown) => void> = []
  const sent: SentMessage[] = []
  const deleted: number[] = []
  let receiptId = 100

  const settings = {
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

  const fetchMock = vi.fn(async (url: string, init: RequestInit = {}) => {
    const method = init.method ?? 'GET'

    if (url.includes('/getStateInstance/')) {
      return jsonResponse({ stateInstance: 'authorized' })
    }

    if (url.includes('/getSettings/')) {
      return jsonResponse(settings)
    }

    if (url.includes('/setSettings/')) {
      Object.assign(settings, JSON.parse(String(init.body)))
      return jsonResponse({ saveSettings: true })
    }

    if (url.includes('/checkAccount/')) {
      expect(JSON.parse(String(init.body))).toEqual({ phoneNumber: 79991234567 })
      return jsonResponse({ exist: true, chatId: '10000000', fromCache: false })
    }

    if (url.includes('/sendMessage/')) {
      sent.push(JSON.parse(String(init.body)) as SentMessage)
      return jsonResponse({ idMessage: 'MSG-1' })
    }

    if (url.includes('/deleteNotification/')) {
      deleted.push(Number(url.split('/').pop()))
      return jsonResponse({ result: true })
    }

    if (url.includes('/receiveNotification/')) {
      if (queue.length === 0) {
        return new Promise((resolve) => waiting.push(resolve)) as unknown as Response
      }

      return jsonResponse(queue.shift())
    }

    throw new Error(`Неожиданный запрос: ${method} ${url}`)
  })

  return {
    fetchMock,
    sent,
    deleted,
    settings,
    pushNotification(body: NotificationBody) {
      receiptId += 1
      const resolve = waiting.shift()

      if (resolve) {
        resolve(jsonResponse({ receiptId, body }))
      } else {
        queue.push({ receiptId, body })
      }
    },
  }
}

let greenApi: ReturnType<typeof createGreenApiMock>

beforeEach(() => {
  greenApi = createGreenApiMock()
  vi.stubGlobal('fetch', greenApi.fetchMock)
  window.localStorage.clear()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('сценарий пользователя', () => {
  it('подключает инстанс, находит чат, отправляет и принимает сообщения', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText('idInstance'), '3100000001')
    await user.type(screen.getByLabelText('apiTokenInstance'), 'secret-token-value')
    await user.click(screen.getByRole('button', { name: 'Подключить инстанс' }))

    const newChatButton = await screen.findByRole('button', { name: 'Новый чат' })
    expect(newChatButton).toBeInTheDocument()

    await user.click(newChatButton)
    await user.type(screen.getByLabelText('Номер телефона получателя'), '79991234567')
    await user.click(screen.getByRole('button', { name: 'Найти' }))

    const composer = await screen.findByLabelText('Текст сообщения')
    expect(screen.getByRole('heading', { level: 1, name: '+7 (999) 123-45-67' })).toBeInTheDocument()

    await user.type(composer, 'Привет, это тестовое сообщение{Enter}')

    const log = screen.getByRole('log')
    await waitFor(() => expect(within(log).getByText('Привет, это тестовое сообщение')).toBeInTheDocument())

    await waitFor(() => expect(greenApi.sent).toEqual([{ chatId: '10000000', message: 'Привет, это тестовое сообщение' }]))

    expect(composer).toHaveValue('')

    greenApi.pushNotification({
      typeWebhook: 'incomingMessageReceived',
      timestamp: Math.floor(Date.now() / 1000),
      idMessage: 'INCOMING-1',
      senderData: {
        chatId: '10000000',
        chatName: 'Иван Петров',
        chatType: 'user',
        sender: '10000000',
        senderPhoneNumber: 79991234567,
      },
      messageData: { typeMessage: 'textMessage', textMessageData: { textMessage: 'Привет! Всё получил.' } },
    })

    await waitFor(() => expect(within(log).getByText('Привет! Всё получил.')).toBeInTheDocument())

    expect(greenApi.deleted).toHaveLength(1)

    expect(within(log).getByText('Привет! Всё получил.').closest('.message')).toHaveClass('message--incoming')
  })

  it('не смешивает историю двух разных инстансов', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText('idInstance'), '3100000001')
    await user.type(screen.getByLabelText('apiTokenInstance'), 'secret-token-value')
    await user.click(screen.getByRole('button', { name: 'Подключить инстанс' }))

    await user.click(await screen.findByRole('button', { name: 'Новый чат' }))
    await user.type(screen.getByLabelText('Номер телефона получателя'), '79991234567')
    await user.click(screen.getByRole('button', { name: 'Найти' }))

    const composer = await screen.findByLabelText('Текст сообщения')
    await user.type(composer, 'Секретное сообщение{Enter}')
    await waitFor(() => expect(greenApi.sent).toHaveLength(1))

    await user.click(screen.getByRole('button', { name: 'Отключить инстанс' }))
    expect(await screen.findByRole('button', { name: 'Подключить инстанс' })).toBeInTheDocument()
    expect(window.localStorage.getItem('max-chat.credentials.v1')).toBeNull()

    await user.type(screen.getByLabelText('idInstance'), '3100000002')
    await user.type(screen.getByLabelText('apiTokenInstance'), 'another-token')
    await user.click(screen.getByRole('button', { name: 'Подключить инстанс' }))

    expect(await screen.findByRole('button', { name: 'Новый чат' })).toBeInTheDocument()
    expect(screen.queryByText('Секретное сообщение')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Новый чат' }))
    await user.type(screen.getByLabelText('Номер телефона получателя'), '79991234567')
    await user.click(screen.getByRole('button', { name: 'Найти' }))

    expect(await screen.findByLabelText('Текст сообщения')).toHaveValue('')
    expect(screen.queryByText('Секретное сообщение')).not.toBeInTheDocument()
  })

  it('обнаруживает выключенный incomingWebhook и предлагает включить', async () => {
    const user = userEvent.setup()
    greenApi.settings.incomingWebhook = 'no'
    greenApi.settings.webhookUrl = 'https://example.com/hook'

    render(<App />)
    await user.type(screen.getByLabelText('idInstance'), '3100000001')
    await user.type(screen.getByLabelText('apiTokenInstance'), 'secret-token-value')
    await user.click(screen.getByRole('button', { name: 'Подключить инстанс' }))

    expect(await screen.findByText('Инстанс не настроен на приём уведомлений')).toBeInTheDocument()

    expect(greenApi.fetchMock.mock.calls.some(([url]) => String(url).includes('receiveNotification'))).toBe(
      false,
    )

    await user.click(screen.getByRole('button', { name: 'Включить и очистить очередь' }))

    expect(await screen.findByText('Настройки сохранены')).toBeInTheDocument()
    expect(greenApi.settings.incomingWebhook).toBe('yes')
    expect(greenApi.settings.webhookUrl).toBe('')
  })

  it('показывает подсказку и блокирует отправку, если инстанс не авторизован', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn(async (url: string, init: RequestInit = {}) => {
      if (url.includes('/getStateInstance/')) {
        return jsonResponse({ stateInstance: 'notAuthorized' })
      }

      if (url.includes('/getSettings/')) {
        return jsonResponse(greenApi.settings)
      }

      if (url.includes('/checkAccount/')) {
        return jsonResponse({ exist: true, chatId: '10000000', fromCache: false })
      }

      if (url.includes('/receiveNotification/')) {
        return new Promise(() => {}) as unknown as Response
      }

      throw new Error(`Неожиданный запрос: ${init.method ?? 'GET'} ${url}`)
    })

    vi.stubGlobal('fetch', fetchMock)
    render(<App />)
    await user.type(screen.getByLabelText('idInstance'), '3100000001')
    await user.type(screen.getByLabelText('apiTokenInstance'), 'secret-token-value')
    await user.click(screen.getByRole('button', { name: 'Подключить инстанс' }))

    expect(await screen.findByText('Инстанс не авторизован')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Новый чат' }))
    await user.type(screen.getByLabelText('Номер телефона получателя'), '79991234567')
    await user.click(screen.getByRole('button', { name: 'Найти' }))

    const composer = await screen.findByLabelText('Текст сообщения')
    expect(composer).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Отправить сообщение' })).toBeDisabled()
  })
})

import { describe, expect, it, vi } from 'vitest'

import { GreenApiError } from './errors'
import { GreenApi } from './greenApi'
import { REQUIRED_SETTINGS } from './types'
import type { Credentials } from './types'

const credentials: Credentials = {
  idInstance: '3100000001',
  apiTokenInstance: 'secret-token',
  apiUrl: 'https://api.green-api.com',
}

const BASE = 'https://api.green-api.com/waInstance3100000001'

/** Минимальный ответ fetch: клиенту достаточно ok, status и text. */
function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => (body === undefined ? '' : JSON.stringify(body)),
  } as unknown as Response
}

function emptyResponse(status = 200): Response {
  return jsonResponse(undefined, status)
}

describe('GreenApi.buildUrl', () => {
  const api = new GreenApi(credentials)

  it('подставляет номер инстанса в адрес', () => {
    expect(api.buildUrl('sendMessage/secret-token')).toBe(`${BASE}/sendMessage/secret-token`)
  })

  it('добавляет query-параметры', () => {
    expect(api.buildUrl('receiveNotification/secret-token', { receiveTimeout: '5' })).toBe(
      `${BASE}/receiveNotification/secret-token?receiveTimeout=5`,
    )
  })

  it('убирает завершающий слешш в адресе хоста', () => {
    const apiWithSlash = new GreenApi({ ...credentials, apiUrl: 'https://api.green-api.com/' })
    expect(apiWithSlash.buildUrl('getStateInstance/secret-token')).toBe(
      `${BASE}/getStateInstance/secret-token`,
    )
  })
})

describe('GreenApi.getStateInstance', () => {
  it('возвращает состояние инстанса', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ stateInstance: 'authorized' }))
    const api = new GreenApi(credentials, fetchImpl)

    await expect(api.getStateInstance()).resolves.toEqual({ stateInstance: 'authorized' })
    expect(fetchImpl).toHaveBeenCalledWith(
      `${BASE}/getStateInstance/secret-token`,
      expect.objectContaining({ method: 'GET' }),
    )
  })
})

describe('GreenApi.checkAccount', () => {
  it('отправляет номер телефона числом', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ exist: true, chatId: '10000000', fromCache: false }))
    const api = new GreenApi(credentials, fetchImpl)

    await api.checkAccount('79991234567')

    const [, init] = fetchImpl.mock.calls[0]!
    expect(init.body).toBe(JSON.stringify({ phoneNumber: 79991234567 }))
  })

  it('возвращает признак отсутствия аккаунта', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse({ exist: false, chatId: '', fromCache: false }))
    const api = new GreenApi(credentials, fetchImpl)

    await expect(api.checkAccount('79991234567')).resolves.toEqual({
      exist: false,
      chatId: '',
      fromCache: false,
    })
  })
})

describe('GreenApi.sendMessage', () => {
  it('отправляет chatId и текст сообщения', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ idMessage: '1763115112345' }))
    const api = new GreenApi(credentials, fetchImpl)

    await expect(api.sendMessage('10000000', 'Привет')).resolves.toEqual({ idMessage: '1763115112345' })

    const [url, init] = fetchImpl.mock.calls[0]!
    expect(url).toBe(`${BASE}/sendMessage/secret-token`)
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({ chatId: '10000000', message: 'Привет' })
  })
})

describe('GreenApi.receiveNotification', () => {
  it('возвращает уведомление и receiptId', async () => {
    const body = { typeWebhook: 'incomingMessageReceived', timestamp: 1763115112 }
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ receiptId: 42, body }))
    const api = new GreenApi(credentials, fetchImpl)

    await expect(api.receiveNotification()).resolves.toEqual({ receiptId: 42, body })
  })

  it('трактует пустой ответ как пустую очередь', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(emptyResponse())
    const api = new GreenApi(credentials, fetchImpl)

    await expect(api.receiveNotification()).resolves.toEqual({ receiptId: 0, body: null })
  })

  it('трактует ответ `null` как пустую очередь', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => 'null',
    } as unknown as Response)
    const api = new GreenApi(credentials, fetchImpl)

    await expect(api.receiveNotification()).resolves.toEqual({ receiptId: 0, body: null })
  })
})

describe('GreenApi.deleteNotification', () => {
  it('удаляет уведомление по receiptId в пути запроса', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ result: true }))
    const api = new GreenApi(credentials, fetchImpl)

    await expect(api.deleteNotification(42)).resolves.toEqual({ result: true })

    const [url, init] = fetchImpl.mock.calls[0]!
    expect(url).toBe(`${BASE}/deleteNotification/secret-token/42`)
    expect(init.method).toBe('DELETE')
  })
})

describe('GreenApi.receiveNotification: целостность уведомления', () => {
  it('показывает тело, даже если receiptId пришёл строкой', async () => {
    const body = { typeWebhook: 'incomingMessageReceived', timestamp: 1 }
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ receiptId: '42', body }))
    const api = new GreenApi(credentials, fetchImpl)

    await expect(api.receiveNotification()).resolves.toEqual({ receiptId: 42, body })
  })

  it('не теряет уведомление, если receiptId отсутствует', async () => {
    const body = { typeWebhook: 'incomingMessageReceived', timestamp: 1 }
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ body }))
    const api = new GreenApi(credentials, fetchImpl)

    // receiptId 0 — сигнал вызывающему коду не подтверждать уведомление,
    // но само тело всё равно должно быть обработано.
    await expect(api.receiveNotification()).resolves.toEqual({ receiptId: 0, body })
  })
})

describe('GreenApi.getSettings / setSettings', () => {
  it('читает настройки инстанса', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse({ wid: '79991234567@c.us', typeInstance: 'v3' }))
    const api = new GreenApi(credentials, fetchImpl)

    await api.getSettings()

    expect(fetchImpl).toHaveBeenCalledWith(
      `${BASE}/getSettings/secret-token`,
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('отправляет только переданные настройки', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ saveSettings: true }))
    const api = new GreenApi(credentials, fetchImpl)

    await api.setSettings({ ...REQUIRED_SETTINGS })

    const [url, init] = fetchImpl.mock.calls[0]!
    expect(url).toBe(`${BASE}/setSettings/secret-token`)
    expect(JSON.parse(init.body)).toEqual({
      incomingWebhook: 'yes',
      outgoingWebhook: 'yes',
      outgoingMessageWebhook: 'yes',
      outgoingAPIMessageWebhook: 'yes',
      stateWebhook: 'yes',
      webhookUrl: '',
    })
  })
})

describe('обработка ошибок', () => {
  it('превращает ошибку валидации в GreenApiError с текстом сервера', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse({ error: "Wrong format. 'phoneNumber' must contain only digits" }, 400))
    const api = new GreenApi(credentials, fetchImpl)

    await expect(api.checkAccount('abc')).rejects.toThrowError(/phoneNumber/)
  })

  it('помечает превышение лимита частоты запросов', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(emptyResponse(429))
    const api = new GreenApi(credentials, fetchImpl)

    const error = await api.getStateInstance().catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(GreenApiError)
    expect((error as GreenApiError).isRateLimited).toBe(true)
  })

  it('преврачает сетевой сбой в ошибку без HTTP-статуса', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    const api = new GreenApi(credentials, fetchImpl)

    const error = await api.getStateInstance().catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(GreenApiError)
    expect((error as GreenApiError).httpStatus).toBe(0)
  })

  it('подсказывает про запрет доступа при 403', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(emptyResponse(403))
    const api = new GreenApi(credentials, fetchImpl)

    await expect(api.sendMessage('1', 'text')).rejects.toThrowError(/idInstance/)
  })
})

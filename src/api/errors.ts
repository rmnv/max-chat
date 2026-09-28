export class GreenApiError extends Error {
  readonly httpStatus: number | null
  readonly payload: unknown

  constructor(message: string, httpStatus: number | null, payload?: unknown) {
    super(message)
    this.name = 'GreenApiError'
    this.httpStatus = httpStatus
    this.payload = payload
  }

  get isRateLimited(): boolean {
    return this.httpStatus === 429
  }
}

export function extractErrorMessage(payload: unknown, httpStatus: number | null): string {
  const fromBody = readMessage(payload)

  if (fromBody) return fromBody

  if (httpStatus === 429) {
    return 'Превышен лимит частоты запросов. Подождите пару секунд и повторите.'
  }
  if (httpStatus === 0) {
    return 'Нет связи с GREEN-API. Проверьте интернет и доступность api.green-api.com.'
  }
  if (httpStatus === 401 || httpStatus === 403) {
    return 'Доступ запрещён. Проверьте idInstance и apiTokenInstance и авторизацию инстанса.'
  }
  if (httpStatus) {
    return `GREEN-API вернула ошибку ${httpStatus}.`
  }

  return 'Неизвестная ошибка GREEN-API.'
}

function readMessage(payload: unknown): string | null {
  if (typeof payload === 'string') {
    const text = payload.trim()
    return text === '' || text === 'null' ? null : text
  }

  if (Array.isArray(payload)) {
    for (const item of payload) {
      const message = readMessage(item)
      if (message) return message
    }
    return null
  }

  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>
    for (const key of ['error', 'message', 'reason', 'description', 'errors'] as const) {
      const message = readMessage(record[key])
      if (message) return message
    }
  }

  return null
}

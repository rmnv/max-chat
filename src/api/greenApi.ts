import { extractErrorMessage, GreenApiError } from './errors'
import type {
  CheckAccountResponse,
  Credentials,
  DeleteNotificationResponse,
  GetStateInstanceResponse,
  InstanceSettings,
  ReceiveNotificationResponse,
  SendMessageResponse,
  SetSettingsResponse,
} from './types'

export const DEFAULT_API_URL = 'https://api.green-api.com'
export const MAX_MESSAGE_LENGTH = 4000
export const RECEIVE_TIMEOUT_SECONDS = 5

const RECEIVE_HTTP_TIMEOUT_MS = (RECEIVE_TIMEOUT_SECONDS + 10) * 1000
const REQUEST_TIMEOUT_MS = 20_000

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>
type Verb = 'GET' | 'POST' | 'DELETE'

export interface RequestOptions {
  signal?: AbortSignal
}

export class GreenApi {
  private readonly credentials: Credentials
  private readonly fetchImpl: FetchLike

  constructor(credentials: Credentials, fetchImpl: FetchLike = globalThis.fetch.bind(globalThis)) {
    this.credentials = credentials
    this.fetchImpl = fetchImpl
  }

  getStateInstance(options: RequestOptions = {}): Promise<GetStateInstanceResponse> {
    return this.request('getStateInstance', { ...options, verb: 'GET' })
  }

  checkAccount(phoneNumber: string, options: RequestOptions = {}): Promise<CheckAccountResponse> {
    return this.request('checkAccount', {
      ...options,
      verb: 'POST',
      body: JSON.stringify({ phoneNumber: Number(phoneNumber) }),
    })
  }

  sendMessage(chatId: string, message: string, options: RequestOptions = {}): Promise<SendMessageResponse> {
    return this.request('sendMessage', {
      ...options,
      verb: 'POST',
      body: JSON.stringify({ chatId, message }),
    })
  }

  async receiveNotification(options: RequestOptions = {}): Promise<ReceiveNotificationResponse> {
    const response = await this.request<ReceiveNotificationResponse | null>('receiveNotification', {
      ...options,
      verb: 'GET',
      query: { receiveTimeout: String(RECEIVE_TIMEOUT_SECONDS) },
      timeoutMs: RECEIVE_HTTP_TIMEOUT_MS,
    })

    const body = response?.body ?? null
    if (!body) return { receiptId: 0, body: null }

    // Тело важнее receiptId: даже если идентификатор не распознан, уведомление
    // нужно показать, иначе оно молча терялось бы на каждом опросе.
    return { receiptId: toReceiptId(response?.receiptId), body }
  }

  getSettings(options: RequestOptions = {}): Promise<InstanceSettings> {
    return this.request('getSettings', { ...options, verb: 'GET' })
  }

  setSettings(settings: Partial<InstanceSettings>, options: RequestOptions = {}): Promise<SetSettingsResponse> {
    return this.request('setSettings', {
      ...options,
      verb: 'POST',
      body: JSON.stringify(settings),
    })
  }

  deleteNotification(receiptId: number, options: RequestOptions = {}): Promise<DeleteNotificationResponse> {
    return this.request('deleteNotification', {
      ...options,
      verb: 'DELETE',
      suffix: receiptId,
    })
  }

  buildUrl(path: string, query?: Record<string, string>): string {
    const { apiUrl, idInstance } = this.credentials
    const base = `${apiUrl.replace(/\/+$/, '')}/waInstance${idInstance}/${path}`

    if (!query) return base

    const search = new URLSearchParams(query).toString()
    return search ? `${base}?${search}` : base
  }

  private methodPath(method: string, suffix?: number): string {
    const token = this.credentials.apiTokenInstance
    return suffix === undefined ? `${method}/${token}` : `${method}/${token}/${suffix}`
  }

  private async request<T>(
    method: string,
    options: { verb: Verb; body?: string; query?: Record<string, string>; suffix?: number; signal?: AbortSignal; timeoutMs?: number },
  ): Promise<T> {
    const { verb, body, query, suffix, signal: externalSignal, timeoutMs = REQUEST_TIMEOUT_MS } = options
    const timeout = createTimeoutSignal(externalSignal, timeoutMs)

    let response: Response
    try {
      response = await this.fetchImpl(this.buildUrl(this.methodPath(method, suffix), query), {
        method: verb,
        headers: { 'Content-Type': 'application/json' },
        body,
        signal: timeout.signal,
      })
    } catch (error) {
      if (isAbortError(error)) throw error
      throw new GreenApiError(extractErrorMessage(null, 0), 0, error)
    } finally {
      timeout.dispose()
    }

    const payload = await readPayload(response)

    if (!response.ok) {
      throw new GreenApiError(extractErrorMessage(payload, response.status), response.status, payload)
    }

    return payload as T
  }
}

function toReceiptId(value: unknown): number {
  const parsed = typeof value === 'string' ? Number(value) : value
  return typeof parsed === 'number' && Number.isFinite(parsed) ? parsed : 0
}

async function readPayload(response: Response): Promise<unknown> {
  let text: string
  try {
    text = await response.text()
  } catch {
    return null
  }

  const trimmed = text.trim()
  if (trimmed === '' || trimmed === 'null') return null

  try {
    return JSON.parse(trimmed)
  } catch {
    return trimmed
  }
}

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError'
}

function createTimeoutSignal(externalSignal: AbortSignal | undefined, timeoutMs: number) {
  const controller = new AbortController()

  const abort = (reason?: unknown) => {
    if (!controller.signal.aborted) {
      controller.abort(reason ?? new DOMException('Aborted', 'AbortError'))
    }
  }

  const timer = setTimeout(() => abort(new DOMException('Timeout', 'TimeoutError')), timeoutMs)
  const handleAbort = () => abort(externalSignal?.reason)

  if (externalSignal) {
    if (externalSignal.aborted) handleAbort()
    else externalSignal.addEventListener('abort', handleAbort)
  }

  return {
    signal: controller.signal,
    dispose: () => {
      clearTimeout(timer)
      externalSignal?.removeEventListener('abort', handleAbort)
    },
  }
}

import { useState } from 'react'
import type { FormEvent } from 'react'

import { DEFAULT_API_URL, GreenApi, hostOf } from '../api'
import type { Credentials } from '../api'
import { MaxLogo } from './Icons'

interface Props {
  initialCredentials: Credentials | null
  onSubmit: (credentials: Credentials) => void
}

const ID_INSTANCE_PATTERN = /^\d+$/

type Probe =
  | { state: 'idle' }
  | { state: 'checking' }
  | { state: 'ok'; stateInstance: string }
  | { state: 'failed'; reason: string }

export function LoginScreen({ initialCredentials, onSubmit }: Props) {
  const [idInstance, setIdInstance] = useState(initialCredentials?.idInstance ?? '')
  const [apiTokenInstance, setApiTokenInstance] = useState(initialCredentials?.apiTokenInstance ?? '')
  const [apiUrl, setApiUrl] = useState(initialCredentials?.apiUrl ?? DEFAULT_API_URL)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [probe, setProbe] = useState<Probe>({ state: 'idle' })

  async function handleProbe() {
    setProbe({ state: 'checking' })

    try {
      const api = new GreenApi({
        idInstance: idInstance.trim() || '0',
        apiTokenInstance: apiTokenInstance.trim() || 'probe',
        apiUrl: apiUrl.trim() || DEFAULT_API_URL,
      })

      const { stateInstance } = await api.getStateInstance()
      setProbe({ state: 'ok', stateInstance })
    } catch (caught) {
      setProbe({
        state: 'failed',
        reason: caught instanceof Error ? caught.message : 'Неизвестная ошибка.',
      })
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()

    const id = idInstance.trim()
    const token = apiTokenInstance.trim()

    if (!ID_INSTANCE_PATTERN.test(id)) {
      setError('Номер инстанса состоит из цифр (например, 3100000001).')
      return
    }

    if (token.length < 10) {
      setError('Проверьте apiTokenInstance — он выглядит как длинная строка из букв и цифр.')
      return
    }

    const host = apiUrl.trim() || DEFAULT_API_URL
    if (!/^https?:\/\//.test(host)) {
      setError('Адрес apiUrl должен начинаться с https://')
      return
    }

    setError(null)
    onSubmit({ idInstance: id, apiTokenInstance: token, apiUrl: host.replace(/\/+$/, '') })
  }

  return (
    <div className="login">
      <form className="login__card" onSubmit={handleSubmit} noValidate>
        <div className="login__brand">
          <MaxLogo size={56} />
          <h1>MAX Чат</h1>
          <p>Обмен текстовыми сообщениями через GREEN-API</p>
        </div>

        <div className="field">
          <label className="field__label" htmlFor="id-instance">
            idInstance
          </label>
          <input
            id="id-instance"
            className="field__input"
            value={idInstance}
            onChange={(event) => setIdInstance(event.target.value)}
            placeholder="3100000001"
            inputMode="numeric"
            autoComplete="off"
            autoFocus
          />
        </div>

        <div className="field">
          <label className="field__label" htmlFor="api-token">
            apiTokenInstance
          </label>
          <input
            id="api-token"
            className="field__input"
            type="password"
            value={apiTokenInstance}
            onChange={(event) => setApiTokenInstance(event.target.value)}
            placeholder="Ключ доступа инстанса"
            autoComplete="off"
          />
        </div>

        {showAdvanced ? (
          <div className="field">
            <label className="field__label" htmlFor="api-url">
              apiUrl
            </label>
            <input
              id="api-url"
              className="field__input"
              value={apiUrl}
              onChange={(event) => setApiUrl(event.target.value)}
              placeholder={DEFAULT_API_URL}
              autoComplete="off"
            />
          </div>
        ) : (
          <button type="button" className="login__link" onClick={() => setShowAdvanced((value) => !value)}>
            {showAdvanced ? 'Скрыть' : 'Показать'} адрес API
          </button>
        )}

        {error ? <p className="login__error">{error}</p> : null}

        {probe.state !== 'idle' ? (
          <p
            className={`login__probe login__probe--${probe.state === 'ok' ? 'ok' : probe.state === 'failed' ? 'failed' : 'pending'}`}
            role="status"
          >
            {probe.state === 'checking'
              ? `Проверяем ${hostOf(apiUrl || DEFAULT_API_URL)}…`
              : probe.state === 'ok'
                ? `API отвечает, состояние инстанса: ${probe.stateInstance}.`
                : probe.reason}
          </p>
        ) : null}

        <button
          type="button"
          className="button button--ghost login__probe-button"
          onClick={() => void handleProbe()}
          disabled={probe.state === 'checking'}
        >
          {probe.state === 'checking' ? 'Проверяем…' : 'Проверить доступность API'}
        </button>

        <button type="submit" className="button button--primary login__submit">
          Подключить инстанс
        </button>

        <p className="login__hint">
          Данные берутся в{' '}
          <a href="https://console.green-api.com" target="_blank" rel="noreferrer">
            личном кабинете GREEN-API
          </a>
          . Инстанс должен быть авторизован по QR-коду. Учётные данные хранятся только в этом
          браузере.
        </p>
      </form>
    </div>
  )
}

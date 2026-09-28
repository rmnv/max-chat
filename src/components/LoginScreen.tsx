import { useState } from 'react'
import type { FormEvent } from 'react'

import { DEFAULT_API_URL } from '../api'
import type { Credentials } from '../api'
import { MaxLogo } from './Icons'

interface Props {
  initialCredentials: Credentials | null
  onSubmit: (credentials: Credentials) => void
}

const ID_INSTANCE_PATTERN = /^\d+$/

export function LoginScreen({ initialCredentials, onSubmit }: Props) {
  const [idInstance, setIdInstance] = useState(initialCredentials?.idInstance ?? '')
  const [apiTokenInstance, setApiTokenInstance] = useState(initialCredentials?.apiTokenInstance ?? '')
  const [apiUrl, setApiUrl] = useState(initialCredentials?.apiUrl ?? DEFAULT_API_URL)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

        <label className="field">
          <span className="field__label">idInstance</span>
          <input
            className="field__input"
            value={idInstance}
            onChange={(event) => setIdInstance(event.target.value)}
            placeholder="3100000001"
            inputMode="numeric"
            autoComplete="off"
            autoFocus
          />
        </label>

        <label className="field">
          <span className="field__label">apiTokenInstance</span>
          <input
            className="field__input"
            type="password"
            value={apiTokenInstance}
            onChange={(event) => setApiTokenInstance(event.target.value)}
            placeholder="Ключ доступа инстанса"
            autoComplete="off"
          />
        </label>

        {showAdvanced ? (
          <label className="field">
            <span className="field__label">apiUrl</span>
            <input
              className="field__input"
              value={apiUrl}
              onChange={(event) => setApiUrl(event.target.value)}
              placeholder={DEFAULT_API_URL}
              autoComplete="off"
            />
          </label>
        ) : (
          <button type="button" className="login__link" onClick={() => setShowAdvanced((value) => !value)}>
            {showAdvanced ? 'Скрыть' : 'Показать'} адрес API
          </button>
        )}

        {error ? <p className="login__error">{error}</p> : null}

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

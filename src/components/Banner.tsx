import type { ReactNode } from 'react'

import { AlertIcon, CloseIcon, RefreshIcon } from './Icons'

interface Props {
  tone?: 'warning' | 'danger' | 'info'
  title: string
  children?: ReactNode
  onRetry?: () => void
  onDismiss?: () => void
  retryLabel?: string
}

export function Banner({ tone = 'warning', title, children, onRetry, onDismiss, retryLabel = 'Обновить' }: Props) {
  return (
    <div className={`banner banner--${tone}`} role="status">
      <AlertIcon size={18} className="banner__icon" />
      <div className="banner__body">
        <strong>{title}</strong>
        {children ? <p className="banner__text">{children}</p> : null}
      </div>

      <div className="banner__actions">
        {onRetry ? (
          <button type="button" className="button button--ghost button--small" onClick={onRetry}>
            <RefreshIcon size={16} />
            {retryLabel}
          </button>
        ) : null}
        {onDismiss ? (
          <button
            type="button"
            className="icon-button icon-button--small"
            onClick={onDismiss}
            aria-label="Скрыть"
            title="Скрыть"
          >
            <CloseIcon size={16} />
          </button>
        ) : null}
      </div>
    </div>
  )
}

import type { InstanceSettings, InstanceState } from '../api'
import type { SettingsIssues } from '../hooks/useMaxChat'
import type { ConnectionState, LoopStats } from '../hooks/useNotificationLoop'
import { Banner } from './Banner'
import { RefreshIcon } from './Icons'

interface Props {
  instanceState: InstanceState | null
  instanceError: string | null
  connection: ConnectionState
  connectionError: string | null
  stats: LoopStats
  settings: InstanceSettings | null
  settingsError: string | null
  issues: SettingsIssues
  isFixingSettings: boolean
  settingsFixNote: string | null
  isQuotaExceeded: boolean
  onRetry: () => void
  onRefreshSettings: () => void
  onFixSettings: () => void
  onDismissQuota: () => void
}

export function StatusBanners({
  instanceState,
  instanceError,
  connection,
  connectionError,
  stats,
  settings,
  settingsError,
  issues,
  isFixingSettings,
  settingsFixNote,
  isQuotaExceeded,
  onRetry,
  onRefreshSettings,
  onFixSettings,
  onDismissQuota,
}: Props) {
  const banners = [
    settings !== null && !issues.ok ? (
      <Banner
        key="issues"
        tone="danger"
        title="Инстанс не настроен на приём уведомлений"
        onRetry={isFixingSettings ? undefined : onFixSettings}
        retryLabel="Включить и очистить очередь"
      >
        {issues.incomingOff
          ? 'Выключен переключатель «Получать уведомления о входящих сообщениях» (incomingWebhook) — входящие сообщения не попадают в очередь.'
          : null}
        {issues.outgoingOff
          ? 'Не включён приём статусов и сообщений с телефона (outgoingWebhook, outgoingMessageWebhook).'
          : null}
        {issues.webhookUrlSet
          ? 'Указан webhookUrl — при заполненном поле метод ReceiveNotification не работает, поле должно быть пустым.'
          : null}{' '}
        {isFixingSettings
          ? 'Сохраняем…'
          : 'Кнопка включит нужные переключатели и очистит webhookUrl. Внимание: GREEN-API перезапустит инстанс, настройки применятся в течение 5 минут.'}
      </Banner>
    ) : null,

    settingsFixNote ? (
      <Banner key="fixNote" tone="info" title="Настройки сохранены">
        {settingsFixNote}
      </Banner>
    ) : null,

    settingsError ? (
      <Banner
        key="settingsError"
        tone="warning"
        title="Не удалось прочитать настройки инстанса"
        onRetry={onRefreshSettings}
        retryLabel="Перечитать"
      >
        {settingsError} Пока настройки не прочитаны, приём уведомлений не запускается.
      </Banner>
    ) : null,

    instanceState === 'notAuthorized' ? (
      <Banner
        key="notAuthorized"
        tone="warning"
        title="Инстанс не авторизован"
        onRetry={onRetry}
        retryLabel="Проверить"
      >
        Откройте личный кабинет GREEN-API, получите QR-код инстанса и отсканируйте его в
        приложении MAX. Входящие и исходящие сообщения заработают после авторизации.
      </Banner>
    ) : null,

    instanceState === 'blocked' ? (
      <Banner
        key="blocked"
        tone="danger"
        title="Аккаунт MAX заблокирован"
        onRetry={onRetry}
        retryLabel="Проверить"
      >
        Отправка и получение сообщений недоступны до снятия блокировки на стороне мессенджера.
      </Banner>
    ) : null,

    instanceState === 'suspended' ? (
      <Banner key="suspended" tone="warning" title="На аккаунте временные ограничения">
        Отправка работает только для номеров, сохранивших ваш номер в контактах.
      </Banner>
    ) : null,

    instanceState === 'starting' ? (
      <Banner key="starting" tone="info" title="Инстанс запускается">
        Переход в рабочее состояние занимает до нескольких минут. Страница обновит статус
        автоматически.
      </Banner>
    ) : null,

    instanceError ? (
      <Banner key="instanceError" tone="danger" title="Нет связи с GREEN-API" onRetry={onRetry}>
        {instanceError}
      </Banner>
    ) : null,

    connection === 'error' && connectionError ? (
      <Banner
        key="connectionError"
        tone="danger"
        title="Получение уведомлений приостановлено"
        onRetry={onRetry}
      >
        {connectionError} Запросы повторяются автоматически.
      </Banner>
    ) : null,

    isQuotaExceeded ? (
      <Banner
        key="quota"
        tone="warning"
        title="Превышены ограничения тарифа"
        onDismiss={onDismissQuota}
      >
        На тарифе MAX Developer доступно 3 чата. Дальнейшая отправка может быть недоступна.
      </Banner>
    ) : null,
  ].filter(Boolean)

  if (banners.length === 0) return null

  return (
    <div className="banners">
      {banners}
      <details className="diagnostics">
        <summary>
          <RefreshIcon size={14} />
          Диагностика приёма
        </summary>
        <DiagnosticsBody
          instanceState={instanceState}
          connection={connection}
          stats={stats}
          settings={settings}
          instanceError={instanceError}
          connectionError={connectionError}
        />
      </details>
    </div>
  )
}

function DiagnosticsBody({
  instanceState,
  connection,
  stats,
  settings,
  instanceError,
  connectionError,
}: {
  instanceState: InstanceState | null
  connection: ConnectionState
  stats: LoopStats
  settings: InstanceSettings | null
  instanceError: string | null
  connectionError: string | null
}) {
  return (
    <dl className="diagnostics__grid">
      <dt>Состояние инстанса</dt>
      <dd>{instanceState ?? 'неизвестно'}</dd>

      <dt>Опрос очереди</dt>
      <dd>{connection}</dd>

      <dt>incomingWebhook</dt>
      <dd>{settings?.incomingWebhook ?? '—'}</dd>

      <dt>outgoingWebhook</dt>
      <dd>{settings?.outgoingWebhook ?? '—'}</dd>

      <dt>webhookUrl</dt>
      <dd>{settings ? (settings.webhookUrl === '' ? 'пусто' : settings.webhookUrl) : '—'}</dd>

      <dt>Уведомлений получено</dt>
      <dd>{stats.received}</dd>

      <dt>Последняя ошибка состояния</dt>
      <dd>{instanceError ?? 'нет'}</dd>

      <dt>Последняя ошибка опроса</dt>
      <dd>{connectionError ?? 'нет'}</dd>

      <dt>Последнее уведомление</dt>
      <dd>{stats.lastBody ? JSON.stringify(stats.lastBody) : 'ни одного'}</dd>
    </dl>
  )
}
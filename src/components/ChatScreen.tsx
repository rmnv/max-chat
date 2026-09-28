import { useState } from 'react'

import type { Credentials } from '../api'
import { useMaxChat } from '../hooks/useMaxChat'
import { Avatar } from './Avatar'
import { Composer } from './Composer'
import { BackIcon } from './Icons'
import { MessageList } from './MessageList'
import { Sidebar } from './Sidebar'
import { StatusBanners } from './StatusBanners'

interface Props {
  credentials: Credentials
  onSignOut: () => void
}

const CONNECTION_LABELS: Record<string, string> = {
  idle: 'ожидание',
  connecting: 'подключение…',
  online: 'в сети',
  error: 'нет связи',
}

export function ChatScreen({ credentials, onSignOut }: Props) {
  const {
    chats,
    messages,
    lastMessageByChat,
    activeChat,
    activeChatId,
    activate,
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
    settingsIssues,
    isFixingSettings,
    settingsFixNote,
    refreshInstanceState,
    refreshSettings,
    fixSettings,
    sendMessage,
    startChatWithPhone,
    dismissQuotaNotice,
  } = useMaxChat(credentials)

  const [isCreatingChat, setIsCreatingChat] = useState(false)

  async function handleCreateChat(phone: string) {
    setIsCreatingChat(true)
    try {
      return await startChatWithPhone(phone)
    } finally {
      setIsCreatingChat(false)
    }
  }

  return (
    <div className={`layout${activeChat ? ' layout--chat-open' : ''}`}>
      <Sidebar
        chats={chats}
        lastMessageByChat={lastMessageByChat}
        activeChatId={activeChatId}
        isCreatingChat={isCreatingChat}
        isInstanceOk={isAuthorized}
        instanceStateLabel={instanceStateLabel(instanceState, isCheckingState, instanceError)}
        onSelectChat={activate}
        onCreateChat={handleCreateChat}
        onSignOut={onSignOut}
      />

      <main className="chat">
        <StatusBanners
          instanceState={instanceState}
          instanceError={instanceError}
          connection={connection}
          connectionError={connectionError}
          stats={stats}
          settings={settings}
          settingsError={settingsError}
          issues={settingsIssues}
          isFixingSettings={isFixingSettings}
          settingsFixNote={settingsFixNote}
          isQuotaExceeded={isQuotaExceeded}
          onRetry={() => void refreshInstanceState()}
          onRefreshSettings={() => void refreshSettings()}
          onFixSettings={() => void fixSettings()}
          onDismissQuota={dismissQuotaNotice}
        />

        {activeChat ? (
          <>
            <header className="chat__header">
              <button
                type="button"
                className="icon-button chat__back"
                onClick={() => activate(null)}
                aria-label="К списку чатов"
              >
                <BackIcon size={22} />
              </button>
              <Avatar title={activeChat.title} seed={activeChat.chatId} size={42} />
              <div className="chat__identity">
                <h1 className="chat__title">{activeChat.title}</h1>
                <span className="chat__subtitle">
                  {CONNECTION_LABELS[connection] ?? connection}
                  {activeChat.isGroup ? ' · групповой чат' : ''}
                </span>
              </div>
            </header>

            <MessageList messages={messages} />

            <Composer
              disabled={!isAuthorized}
              disabledHint="Инстанс не авторизован — отправка недоступна"
              onSend={sendMessage}
            />
          </>
        ) : (
          <div className="chat chat--empty">
            <p>Выберите чат слева или начните новый по номеру телефона.</p>
          </div>
        )}
      </main>
    </div>
  )
}

function instanceStateLabel(state: string | null, isChecking: boolean, error: string | null): string {
  if (error) return 'нет связи'
  if (!state) return isChecking ? 'проверяем…' : 'ожидание'

  switch (state) {
    case 'authorized':
      return 'подключено'
    case 'notAuthorized':
      return 'не авторизован'
    case 'starting':
      return 'запускается'
    case 'blocked':
      return 'аккаунт заблокирован'
    case 'suspended':
      return 'ограничения'
    case 'pendingPassword':
      return 'нужен пароль 2FA'
    default:
      return state
  }
}

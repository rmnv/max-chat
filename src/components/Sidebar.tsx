import { useState } from 'react'
import type { FormEvent } from 'react'

import type { ActionResult } from '../hooks/useMaxChat'
import type { Chat, Message } from '../model'
import { formatTime } from '../utils/date'
import { Avatar } from './Avatar'
import { LogoutIcon, MaxLogo, NewChatIcon } from './Icons'

interface Props {
  chats: Chat[]
  lastMessageByChat: Map<string, Message>
  activeChatId: string | null
  isCreatingChat: boolean
  instanceStateLabel: string
  isInstanceOk: boolean
  onSelectChat: (chatId: string) => void
  onCreateChat: (phone: string) => Promise<ActionResult>
  onSignOut: () => void
}

export function Sidebar({
  chats,
  lastMessageByChat,
  activeChatId,
  isCreatingChat,
  instanceStateLabel,
  isInstanceOk,
  onSelectChat,
  onCreateChat,
  onSignOut,
}: Props) {
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  function close() {
    setIsOpen(false)
    setError(null)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()

    const result = await onCreateChat(phone)

    if (result.ok) {
      setPhone('')
      close()
    } else {
      setError(result.error ?? 'Не удалось создать чат.')
    }
  }

  return (
    <aside className="sidebar">
      <header className="sidebar__header">
        <MaxLogo size={30} />
        <div className="sidebar__identity">
          <strong>MAX Чат</strong>
          <span className={`sidebar__state ${isInstanceOk ? 'sidebar__state--ok' : 'sidebar__state--warn'}`}>
            {instanceStateLabel}
          </span>
        </div>
        <button
          type="button"
          className="icon-button"
          onClick={onSignOut}
          title="Отключить инстанс"
          aria-label="Отключить инстанс"
        >
          <LogoutIcon />
        </button>
      </header>

      <div className="sidebar__new-chat">
        {isOpen ? (
          <form className="new-chat" onSubmit={handleSubmit}>
            <input
              className="field__input"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="Номер телефона, например 79991234567"
              inputMode="tel"
              autoFocus
              aria-label="Номер телефона получателя"
            />
            <div className="new-chat__actions">
              <button type="button" className="button button--ghost" onClick={close}>
                Отмена
              </button>
              <button type="submit" className="button button--primary" disabled={isCreatingChat}>
                {isCreatingChat ? 'Проверяем…' : 'Найти'}
              </button>
            </div>
            {error ? <p className="new-chat__error">{error}</p> : null}
          </form>
        ) : (
          <button
            type="button"
            className="button button--secondary new-chat__trigger"
            onClick={() => setIsOpen(true)}
          >
            <NewChatIcon size={18} />
            Новый чат
          </button>
        )}
      </div>

      {chats.length === 0 ? (
        <p className="sidebar__empty">
          Здесь появятся чаты. Найдите собеседника по номеру телефона или дождитесь входящего
          сообщения.
        </p>
      ) : (
        <ul className="chat-list">
          {chats.map((chat) => (
            <li key={chat.chatId}>
              <ChatItem
                chat={chat}
                last={lastMessageByChat.get(chat.chatId)}
                isActive={chat.chatId === activeChatId}
                onSelect={onSelectChat}
              />
            </li>
          ))}
        </ul>
      )}
    </aside>
  )
}

interface ChatItemProps {
  chat: Chat
  last: Message | undefined
  isActive: boolean
  onSelect: (chatId: string) => void
}

function ChatItem({ chat, last, isActive, onSelect }: ChatItemProps) {
  const preview = !last
    ? 'Нет сообщений'
    : last.status === 'failed'
      ? 'Не отправлено'
      : `${last.direction === 'outgoing' ? 'Вы: ' : ''}${last.text}`

  return (
    <button
      type="button"
      className={`chat-item${isActive ? ' chat-item--active' : ''}`}
      aria-current={isActive ? 'true' : undefined}
      onClick={() => onSelect(chat.chatId)}
    >
      <Avatar title={chat.title} seed={chat.chatId} size={46} />
      <span className="chat-item__body">
        <span className="chat-item__title">
          <span className="chat-item__name">{chat.title}</span>
          {last ? <span className="chat-item__time">{formatTime(last.timestamp)}</span> : null}
        </span>
        <span className="chat-item__preview">{preview}</span>
      </span>
      {chat.unread > 0 ? <span className="badge">{chat.unread}</span> : null}
    </button>
  )
}

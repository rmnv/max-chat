import { useLayoutEffect, useRef, useState } from 'react'

import type { Message } from '../model'
import { formatDayLabel } from '../utils/date'
import { groupByDay } from '../utils/messages'
import { ArrowDownIcon } from './Icons'
import { MessageBubble } from './MessageBubble'

interface Props {
  messages: Message[]
}

const STICK_THRESHOLD_PX = 80

export function MessageList({ messages }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const shouldStickRef = useRef(true)
  const [isAtBottom, setIsAtBottom] = useState(true)

  useLayoutEffect(() => {
    const element = containerRef.current
    if (element && shouldStickRef.current) {
      element.scrollTop = element.scrollHeight
    }
  }, [messages])

  function handleScroll() {
    const element = containerRef.current
    if (!element) return

    const atBottom = element.scrollHeight - element.scrollTop - element.clientHeight <= STICK_THRESHOLD_PX

    shouldStickRef.current = atBottom
    setIsAtBottom(atBottom)
  }

  function scrollToBottom() {
    containerRef.current?.scrollTo({ top: containerRef.current.scrollHeight, behavior: 'smooth' })
  }

  return (
    <div className="message-area">
      <div
        className="message-area__scroll"
        ref={containerRef}
        onScroll={handleScroll}
        role="log"
        aria-label="Сообщения"
      >
        {messages.length === 0 ? (
          <p className="message-area__empty">
            Сообщений пока нет. Напишите первым — сообщение уйдёт в MAX и появится у собеседника.
          </p>
        ) : (
          groupByDay(messages).map((group) => (
            <section key={group.day} className="day-group">
              <div className="day-separator">
                <span>{formatDayLabel(group.messages[0]!.timestamp)}</span>
              </div>
              {group.messages.map((message) => (
                <MessageBubble key={message.localId} message={message} />
              ))}
            </section>
          ))
        )}
      </div>

      {!isAtBottom && messages.length > 0 ? (
        <button
          type="button"
          className="scroll-down"
          onClick={scrollToBottom}
          aria-label="К последним сообщениям"
          title="К последним сообщениям"
        >
          <ArrowDownIcon size={20} />
        </button>
      ) : null}
    </div>
  )
}

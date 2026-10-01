import { memo } from 'react'

import type { Message } from '../model'
import { formatTime } from '../utils/date'
import { StatusIcon } from './Icons'

interface Props {
  message: Message
}

export const MessageBubble = memo(function MessageBubble({ message }: Props) {
  const isOutgoing = message.direction === 'outgoing'
  const isFailed = message.status === 'failed'

  return (
    <div className={`message message--${message.direction}`}>
      <div className={`bubble bubble--${message.direction}${isFailed ? ' bubble--failed' : ''}`}>
        <p className="bubble__text">{message.text}</p>
        <span className="bubble__meta">
          <span className="bubble__time">{formatTime(message.timestamp)}</span>
          {isOutgoing ? <StatusIcon status={message.status} /> : null}
        </span>
      </div>

      {isFailed && message.error ? <p className="bubble__error">{message.error}</p> : null}
    </div>
  )
})

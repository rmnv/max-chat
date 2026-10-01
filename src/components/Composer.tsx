import { useLayoutEffect, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'

import { MAX_MESSAGE_LENGTH } from '../api'
import { SendIcon } from './Icons'

interface Props {
  disabled: boolean
  disabledHint?: string
  onSend: (text: string) => Promise<{ ok: boolean; error?: string }>
}

const COUNTER_THRESHOLD = MAX_MESSAGE_LENGTH - 200
const MAX_TEXTAREA_HEIGHT = 132

export function Composer({ disabled, disabledHint, onSend }: Props) {
  const [text, setText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useLayoutEffect(() => {
    const element = textareaRef.current
    if (!element) return

    element.style.height = 'auto'
    element.style.height = `${Math.min(element.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`
  }, [text])

  const isTooLong = text.length > MAX_MESSAGE_LENGTH
  const canSend = !disabled && !isSending && text.trim() !== '' && !isTooLong

  async function submit() {
    if (!canSend) return

    const sent = text
    setIsSending(true)

    try {
      const result = await onSend(sent)

      if (result.ok) {
        setText((current) => (current.trim() === sent.trim() ? '' : current))
      }
    } finally {
      setIsSending(false)
      textareaRef.current?.focus()
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    void submit()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      void submit()
    }
  }

  return (
    <form className="composer" onSubmit={handleSubmit}>
      <div className="composer__field">
        <textarea
          ref={textareaRef}
          className="composer__input"
          value={text}
          rows={1}
          disabled={disabled}
          placeholder={disabled ? (disabledHint ?? 'Сообщения недоступны') : 'Напишите сообщение…'}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={handleKeyDown}
          aria-label="Текст сообщения"
        />

        {text.length > COUNTER_THRESHOLD ? (
          <span className={`composer__counter${isTooLong ? ' composer__counter--over' : ''}`}>
            {text.length} / {MAX_MESSAGE_LENGTH}
          </span>
        ) : null}
      </div>

      <button type="submit" className="composer__send" disabled={!canSend} aria-label="Отправить сообщение">
        <SendIcon size={22} />
      </button>
    </form>
  )
}

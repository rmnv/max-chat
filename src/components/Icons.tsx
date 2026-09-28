import { useId } from 'react'

import type { MessageStatus } from '../model'

interface IconProps {
  size?: number
  className?: string
}

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  focusable: false,
})

export function SendIcon({ size = 20, className }: IconProps) {
  return (
    <svg {...base(size)} className={className} viewBox="0 0 24 24">
      <path d="M3.2 20.4 21.3 12 3.2 3.6l.1 6.7 12 1.7-12 1.7Z" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function NewChatIcon({ size = 20, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  )
}

export function LogoutIcon({ size = 20, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M15 17.5 20 12l-5-5.5" />
      <path d="M20 12H9" />
      <path d="M12 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6" />
    </svg>
  )
}

export function RefreshIcon({ size = 20, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M20.5 12a8.5 8.5 0 1 1-2.6-6.1" />
      <path d="M20.5 4v5h-5" />
    </svg>
  )
}

export function CloseIcon({ size = 20, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="m18 6-12 12" />
      <path d="m6 6 12 12" />
    </svg>
  )
}

export function ArrowDownIcon({ size = 20, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M12 5v13" />
      <path d="m6 12 6 6 6-6" />
    </svg>
  )
}

export function BackIcon({ size = 20, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M19 12H5" />
      <path d="m11 6-6 6 6 6" />
    </svg>
  )
}

export function ClockIcon({ size = 14, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  )
}

export function CheckIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="m19 6.5-9.5 9.5-4.5-4.5" />
    </svg>
  )
}

export function DoubleCheckIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="m1.5 12.5 3.5 3.5 7-7" />
      <path d="m9 12.5 3.5 3.5 7-7" />
    </svg>
  )
}

export function AlertIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9.5v4" />
      <path d="M12 17.2h.01" />
    </svg>
  )
}

const STATUS_ICONS: Record<MessageStatus, { Icon: typeof CheckIcon; className: string }> = {
  pending: { Icon: ClockIcon, className: 'status status-pending' },
  sent: { Icon: CheckIcon, className: 'status status-sent' },
  delivered: { Icon: DoubleCheckIcon, className: 'status status-delivered' },
  read: { Icon: DoubleCheckIcon, className: 'status status-read' },
  failed: { Icon: AlertIcon, className: 'status status-failed' },
}

export function StatusIcon({ status, size = 15 }: { status: MessageStatus; size?: number }) {
  const { Icon, className } = STATUS_ICONS[status]
  return <Icon size={size} className={className} />
}

export function MaxLogo({ size = 36, className }: IconProps) {
  const gradientId = useId()

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      className={className}
      role="img"
      aria-label="MAX"
      focusable={false}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#01c5c8" />
          <stop offset="0.45" stopColor="#046ef4" />
          <stop offset="0.62" stopColor="#572dff" />
          <stop offset="1" stopColor="#8b4bff" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="12" fill={`url(#${gradientId})`} />
      <path
        d="M11 28.5V13l9 9 9-9v15.5"
        fill="none"
        stroke="#fff"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

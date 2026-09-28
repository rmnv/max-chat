import { initialsFromTitle } from '../utils/text'

const GRADIENTS: Array<[string, string]> = [
  ['#bf97ff', '#526eff'],
  ['#ff48b6', '#ff8a35'],
  ['#14e1d5', '#03c722'],
  ['#08d7f3', '#5398ff'],
  ['#ffc93d', '#ff832a'],
  ['#9b90fe', '#6746ec'],
  ['#fa82ba', '#e74aa6'],
  ['#ffb381', '#e5782d'],
]

interface Props {
  title: string
  seed: string
  size?: number
}

export function Avatar({ title, seed, size = 48 }: Props) {
  const [from, to] = pickGradient(seed)
  const gradientId = `avatar-${from.slice(1)}-${to.slice(1)}`

  return (
    <svg
      className="avatar"
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role="img"
      aria-label={title}
      focusable={false}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={from} />
          <stop offset="1" stopColor={to} />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="16" fill={`url(#${gradientId})`} />
      <text
        x="24"
        y="24"
        className="avatar__text"
        dominantBaseline="central"
        textAnchor="middle"
        fontSize={size > 40 ? 17 : 14}
      >
        {initialsFromTitle(title)}
      </text>
    </svg>
  )
}

function pickGradient(seed: string): [string, string] {
  let hash = 0

  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 100_000
  }

  return GRADIENTS[hash % GRADIENTS.length]!
}

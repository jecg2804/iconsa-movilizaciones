import {
  getRequestStatusStyle,
  getLineStatusStyle,
  getPriorityStyle,
  getTripStatusStyle,
} from '@/lib/utils/status'

type BadgeVariant = 'status' | 'priority' | 'line' | 'trip' | 'custom'

interface BadgeProps {
  label: string
  variant?: BadgeVariant
  bg?: string
  text?: string
  className?: string
}

const variantStyleFn: Record<
  Exclude<BadgeVariant, 'custom'>,
  (label: string) => { bg: string; text: string }
> = {
  status: getRequestStatusStyle,
  priority: getPriorityStyle,
  line: getLineStatusStyle,
  trip: getTripStatusStyle,
}

function Badge({ label, variant = 'status', bg, text, className = '' }: BadgeProps) {
  const style =
    variant === 'custom'
      ? { bg: bg ?? 'bg-gray-100', text: text ?? 'text-gray-700' }
      : variantStyleFn[variant](label)

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${style.bg} ${style.text} ${className}`}
    >
      {label}
    </span>
  )
}

export { Badge }
export type { BadgeProps }

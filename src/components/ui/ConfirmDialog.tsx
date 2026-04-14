'use client'

import { type ReactNode } from 'react'
import { AlertTriangle, AlertOctagon } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: string
  items?: string[]
  children?: ReactNode
  confirmLabel: string
  cancelLabel?: string
  variant?: 'warning' | 'danger'
  loading?: boolean
  confirmDisabled?: boolean
  onConfirm: () => void
  onCancel: () => void
}

const variantStyles = {
  warning: {
    iconColor: 'text-amber-600',
    listBorder: 'border-amber-200',
    listBg: 'bg-amber-50',
    Icon: AlertTriangle,
  },
  danger: {
    iconColor: 'text-red-600',
    listBorder: 'border-red-200',
    listBg: 'bg-red-50',
    Icon: AlertOctagon,
  },
}

function ConfirmDialog({
  open,
  title,
  description,
  items,
  children,
  confirmLabel,
  cancelLabel = 'Cancelar',
  variant = 'warning',
  loading = false,
  confirmDisabled = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const styles = variantStyles[variant]
  const { Icon } = styles

  return (
    <Modal open={open} onClose={onCancel} title={title} maxWidth="md">
      <div className="flex items-start gap-3">
        <Icon className={`mt-0.5 h-6 w-6 shrink-0 ${styles.iconColor}`} />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-gray-700">{description}</p>
          {items && items.length > 0 && (
            <ul className={`mt-3 space-y-1 rounded-lg border ${styles.listBorder} ${styles.listBg} px-3 py-2`}>
              {items.map((item, i) => (
                <li key={i} className="text-sm text-gray-800">• {item}</li>
              ))}
            </ul>
          )}
          {children && <div className="mt-4">{children}</div>}
        </div>
      </div>

      <div className="mt-5 flex items-center justify-end gap-2">
        <Button variant="ghost" onClick={onCancel} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button
          variant={variant === 'danger' ? 'danger' : 'primary'}
          onClick={onConfirm}
          loading={loading}
          disabled={loading || confirmDisabled}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}

export { ConfirmDialog }
export type { ConfirmDialogProps }

import type { ComponentType } from 'react'

type KpiColor = 'navy' | 'blue' | 'green' | 'orange' | 'red'

interface KpiCardProps {
  label: string
  value: number | string
  sublabel?: string
  icon: ComponentType<{ className?: string }>
  color?: KpiColor
}

const colorMap: Record<KpiColor, string> = {
  navy: 'text-navy',
  blue: 'text-iconsa-blue',
  green: 'text-iconsa-green',
  orange: 'text-iconsa-orange',
  red: 'text-red-600',
}

function KpiCard({ label, value, sublabel, icon: Icon, color = 'navy' }: KpiCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-iconsa-gray">{label}</p>
        <Icon className={`h-5 w-5 shrink-0 ${colorMap[color]}`} />
      </div>
      <p className={`mt-2 text-3xl font-bold ${colorMap[color]}`}>{value}</p>
      {sublabel && (
        <p className="mt-1 text-xs text-gray-400">{sublabel}</p>
      )}
    </div>
  )
}

export { KpiCard }
export type { KpiCardProps }

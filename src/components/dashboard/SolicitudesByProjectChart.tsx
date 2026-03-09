'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

interface ProjectData {
  code: string
  name: string
  count: number
}

interface SolicitudesByProjectChartProps {
  data: ProjectData[]
}

const COLORS = ['#1B3A5C', '#0A6EBD', '#553C9A', '#B45309', '#1A7F5A']

function SolicitudesByProjectChart({ data }: SolicitudesByProjectChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center">
        <p className="text-sm text-iconsa-gray">Sin datos</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
        <YAxis
          type="category"
          dataKey="code"
          tick={{ fontSize: 12 }}
          width={55}
        />
        <Tooltip
          formatter={(value) => [String(value), 'Solicitudes']}
          labelFormatter={(label) => {
            const item = data.find((d) => d.code === String(label))
            return item ? `${item.code} — ${item.name}` : String(label)
          }}
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={28}>
          {data.map((_entry, index) => (
            <Cell key={index} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export { SolicitudesByProjectChart }
export type { ProjectData }

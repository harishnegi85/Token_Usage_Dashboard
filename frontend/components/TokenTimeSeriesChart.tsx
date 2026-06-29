'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface TimeSeriesPoint {
  date: string
  haiku_tokens: number
  sonnet_tokens: number
  opus_tokens: number
  total_cost: number
}

interface Props {
  data: TimeSeriesPoint[]
}

function formatTokens(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`
  return value.toString()
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null

  const total = payload.reduce((sum: number, p: any) => sum + (p.value || 0), 0)

  return (
    <div
      className="rounded-lg p-3 border text-xs"
      style={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }}
    >
      <div className="font-semibold mb-2" style={{ color: '#94a3b8' }}>
        {label}
      </div>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center justify-between gap-4 mb-1">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            <span>{p.name}</span>
          </div>
          <span className="font-medium">{formatTokens(p.value)}</span>
        </div>
      ))}
      <div className="border-t mt-2 pt-2" style={{ borderColor: '#334155' }}>
        <div className="flex justify-between">
          <span style={{ color: '#94a3b8' }}>Total</span>
          <span className="font-semibold">{formatTokens(total)}</span>
        </div>
        {payload[0]?.payload?.total_cost !== undefined && (
          <div className="flex justify-between mt-0.5">
            <span style={{ color: '#94a3b8' }}>Cost</span>
            <span className="font-semibold" style={{ color: '#4ade80' }}>
              ${payload[0].payload.total_cost.toFixed(2)}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

export default function TokenTimeSeriesChart({ data }: Props) {
  const formattedData = data.map(d => ({
    ...d,
    date: formatDate(d.date),
  }))

  return (
    <div
      className="rounded-xl p-5 border"
      style={{ backgroundColor: '#1e293b', borderColor: '#334155' }}
    >
      <h3 className="text-sm font-semibold mb-4" style={{ color: '#f1f5f9' }}>
        Token Usage Over Time
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={formattedData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="haikuGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#22d3ee" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="sonnetGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="opusGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#a855f7" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            axisLine={{ stroke: '#334155' }}
            tickLine={false}
            interval={4}
          />
          <YAxis
            tickFormatter={formatTokens}
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ paddingTop: '12px', fontSize: '12px', color: '#94a3b8' }}
            formatter={(value) => <span style={{ color: '#94a3b8' }}>{value}</span>}
          />
          <Area
            type="monotone"
            dataKey="haiku_tokens"
            name="Haiku"
            stackId="1"
            stroke="#22d3ee"
            fill="url(#haikuGrad)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="sonnet_tokens"
            name="Sonnet"
            stackId="1"
            stroke="#6366f1"
            fill="url(#sonnetGrad)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="opus_tokens"
            name="Opus"
            stackId="1"
            stroke="#a855f7"
            fill="url(#opusGrad)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

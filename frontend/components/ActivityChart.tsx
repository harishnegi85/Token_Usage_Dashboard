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

export interface ActivityCost {
  activity: string
  cost_usd: number
  tokens: number
}

const ACTIVITY_COLORS: Record<string, string> = {
  'Development': '#6366f1',
  'Testing': '#22d3ee',
  'Research': '#f59e0b',
  'Requirements': '#4ade80',
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload as ActivityCost
  return (
    <div
      className="rounded-lg p-3 border text-xs"
      style={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }}
    >
      <div className="font-semibold mb-1">{d.activity}</div>
      <div className="flex justify-between gap-4">
        <span style={{ color: '#94a3b8' }}>Cost</span>
        <span style={{ color: '#4ade80' }}>${d.cost_usd.toFixed(4)}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span style={{ color: '#94a3b8' }}>Tokens</span>
        <span>{formatTokens(d.tokens)}</span>
      </div>
    </div>
  )
}

export default function ActivityChart({ data }: { data: ActivityCost[] }) {
  const total = data.reduce((s, d) => s + d.cost_usd, 0)

  return (
    <div
      className="rounded-xl p-5 border"
      style={{ backgroundColor: '#1e293b', borderColor: '#334155' }}
    >
      <h3 className="text-sm font-semibold mb-4" style={{ color: '#f1f5f9' }}>
        Cost by SDLC Activity
      </h3>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 48, left: 8, bottom: 0 }}
        >
          <XAxis
            type="number"
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={v => `$${v.toFixed(2)}`}
          />
          <YAxis
            type="category"
            dataKey="activity"
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={88}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(148,163,184,0.06)' }} />
          <Bar dataKey="cost_usd" radius={[0, 4, 4, 0]} maxBarSize={22}>
            {data.map(entry => (
              <Cell
                key={entry.activity}
                fill={ACTIVITY_COLORS[entry.activity] || '#94a3b8'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="flex flex-col gap-2 mt-3">
        {data.map(d => (
          <div key={d.activity} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: ACTIVITY_COLORS[d.activity] || '#94a3b8' }}
              />
              <span style={{ color: '#f1f5f9' }}>{d.activity}</span>
            </div>
            <div className="flex gap-4" style={{ color: '#94a3b8' }}>
              <span>{formatTokens(d.tokens)}</span>
              <span style={{ color: '#4ade80' }}>${d.cost_usd.toFixed(4)}</span>
              <span style={{ color: '#f1f5f9', fontWeight: 500, minWidth: '3.5rem', textAlign: 'right' }}>
                {total > 0 ? ((d.cost_usd / total) * 100).toFixed(1) : 0}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

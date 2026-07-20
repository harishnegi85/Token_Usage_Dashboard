'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

export interface TokenTypeCost {
  type: string
  cost_usd: number
  tokens: number
}

const TYPE_COLORS: Record<string, string> = {
  'Input': '#6366f1',
  'Output': '#a855f7',
  'Cache Read': '#22d3ee',
  'Cache Write': '#f59e0b',
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload as TokenTypeCost
  const total = payload[0].payload._total as number
  return (
    <div
      className="rounded-lg p-3 border text-xs"
      style={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }}
    >
      <div className="font-semibold mb-1">{d.type}</div>
      <div className="flex justify-between gap-4">
        <span style={{ color: '#94a3b8' }}>Cost</span>
        <span style={{ color: '#4ade80' }}>${d.cost_usd.toFixed(4)}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span style={{ color: '#94a3b8' }}>Share</span>
        <span>{total > 0 ? ((d.cost_usd / total) * 100).toFixed(1) : 0}%</span>
      </div>
    </div>
  )
}

export default function CostBreakdownChart({ data }: { data: TokenTypeCost[] }) {
  const total = data.reduce((s, d) => s + d.cost_usd, 0)
  const enriched = data.map(d => ({ ...d, _total: total }))

  return (
    <div
      className="rounded-xl p-5 border"
      style={{ backgroundColor: '#1e293b', borderColor: '#334155' }}
    >
      <h3 className="text-sm font-semibold mb-4" style={{ color: '#f1f5f9' }}>
        Cost by Token Type
      </h3>
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie
            data={enriched}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={78}
            dataKey="cost_usd"
            paddingAngle={3}
          >
            {enriched.map(entry => (
              <Cell
                key={entry.type}
                fill={TYPE_COLORS[entry.type] || '#94a3b8'}
                stroke="transparent"
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-col gap-2 mt-3">
        {data.map(d => (
          <div key={d.type} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: TYPE_COLORS[d.type] || '#94a3b8' }}
              />
              <span style={{ color: '#f1f5f9' }}>{d.type}</span>
            </div>
            <div className="flex gap-4" style={{ color: '#94a3b8' }}>
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

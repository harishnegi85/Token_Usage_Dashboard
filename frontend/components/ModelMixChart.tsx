'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface ModelData {
  model: string
  tokens: number
  cost: number
  pct_tokens?: number
  pct_cost?: number
  pct?: number
}

interface Props {
  data: ModelData[]
  valueKey?: 'tokens' | 'cost'
  title?: string
}

const MODEL_COLORS: Record<string, string> = {
  'claude-haiku-4-5': '#22d3ee',
  'claude-sonnet-4-6': '#6366f1',
  'claude-opus-4-8': '#a855f7',
}

const MODEL_LABELS: Record<string, string> = {
  'claude-haiku-4-5': 'Haiku',
  'claude-sonnet-4-6': 'Sonnet',
  'claude-opus-4-8': 'Opus',
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length) return null
  const d = payload[0].payload as ModelData

  return (
    <div
      className="rounded-lg p-3 border text-xs"
      style={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }}
    >
      <div className="font-semibold mb-2">{MODEL_LABELS[d.model] || d.model}</div>
      <div className="flex justify-between gap-4">
        <span style={{ color: '#94a3b8' }}>Tokens</span>
        <span>{formatTokens(d.tokens)}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span style={{ color: '#94a3b8' }}>Cost</span>
        <span style={{ color: '#4ade80' }}>${d.cost.toFixed(2)}</span>
      </div>
      {d.pct_tokens !== undefined && (
        <div className="flex justify-between gap-4">
          <span style={{ color: '#94a3b8' }}>% Tokens</span>
          <span>{d.pct_tokens.toFixed(1)}%</span>
        </div>
      )}
      {d.pct !== undefined && (
        <div className="flex justify-between gap-4">
          <span style={{ color: '#94a3b8' }}>Share</span>
          <span>{d.pct.toFixed(1)}%</span>
        </div>
      )}
    </div>
  )
}

const CustomLegend = ({ data }: { data: ModelData[] }) => {
  const total = data.reduce((s, d) => s + d.tokens, 0)
  const totalCost = data.reduce((s, d) => s + d.cost, 0)

  return (
    <div className="flex flex-col gap-2 mt-4">
      {data.map(d => (
        <div key={d.model} className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <div
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: MODEL_COLORS[d.model] || '#94a3b8' }}
            />
            <span style={{ color: '#f1f5f9' }}>{MODEL_LABELS[d.model] || d.model}</span>
          </div>
          <div className="flex gap-4" style={{ color: '#94a3b8' }}>
            <span>{formatTokens(d.tokens)}</span>
            <span style={{ color: '#4ade80' }}>${d.cost.toFixed(2)}</span>
            <span style={{ color: '#f1f5f9', fontWeight: 500 }}>
              {total > 0 ? ((d.tokens / total) * 100).toFixed(1) : 0}%
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function ModelMixChart({ data, title = 'Model Distribution' }: Props) {
  return (
    <div
      className="rounded-xl p-5 border"
      style={{ backgroundColor: '#1e293b', borderColor: '#334155' }}
    >
      <h3 className="text-sm font-semibold mb-4" style={{ color: '#f1f5f9' }}>
        {title}
      </h3>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            dataKey="tokens"
            paddingAngle={3}
          >
            {data.map((entry) => (
              <Cell
                key={entry.model}
                fill={MODEL_COLORS[entry.model] || '#94a3b8'}
                stroke="transparent"
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <CustomLegend data={data} />
    </div>
  )
}

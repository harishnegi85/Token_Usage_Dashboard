'use client'

import { useEffect, useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const API = 'http://localhost:8080'

interface ModelData {
  model: string
  tokens: number
  cost: number
  pct_tokens: number
  pct_cost: number
}

const MODEL_COLORS: Record<string, string> = {
  'claude-haiku-4-5': '#22d3ee',
  'claude-sonnet-4-6': '#6366f1',
  'claude-opus-4-8': '#a855f7',
}

const MODEL_LABELS: Record<string, string> = {
  'claude-haiku-4-5': 'Claude Haiku 4.5',
  'claude-sonnet-4-6': 'Claude Sonnet 4.6',
  'claude-opus-4-8': 'Claude Opus 4.8',
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload as ModelData
  return (
    <div className="rounded-lg p-3 border text-xs" style={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }}>
      <div className="font-semibold mb-2">{MODEL_LABELS[d.model] || d.model}</div>
      <div className="flex justify-between gap-4"><span style={{ color: '#94a3b8' }}>Tokens</span><span>{formatTokens(d.tokens)}</span></div>
      <div className="flex justify-between gap-4"><span style={{ color: '#94a3b8' }}>Cost</span><span style={{ color: '#4ade80' }}>${d.cost.toFixed(2)}</span></div>
      <div className="flex justify-between gap-4"><span style={{ color: '#94a3b8' }}>% Tokens</span><span>{d.pct_tokens.toFixed(1)}%</span></div>
      <div className="flex justify-between gap-4"><span style={{ color: '#94a3b8' }}>% Cost</span><span>{d.pct_cost.toFixed(1)}%</span></div>
    </div>
  )
}

export default function ModelMixPage() {
  const [data, setData] = useState<ModelData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`${API}/api/model-mix`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-sm" style={{ color: '#94a3b8' }}>Loading model mix...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-sm" style={{ color: '#f87171' }}>
          Failed to load data: {error}
        </div>
      </div>
    )
  }

  const totalCost = data.reduce((s, d) => s + d.cost, 0)
  const totalTokens = data.reduce((s, d) => s + d.tokens, 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold" style={{ color: '#f1f5f9' }}>Model Mix</h1>
        <p className="text-sm mt-1" style={{ color: '#94a3b8' }}>
          Org-wide model distribution over the last 30 days
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Tokens', value: formatTokens(totalTokens) },
          { label: 'Total Cost', value: `$${totalCost.toFixed(2)}` },
          { label: 'Models in Use', value: data.length.toString() },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl p-4 border" style={{ backgroundColor: '#1e293b', borderColor: '#334155' }}>
            <div className="text-xs mb-1" style={{ color: '#94a3b8' }}>{label}</div>
            <div className="text-lg font-bold" style={{ color: '#f1f5f9' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Token distribution pie */}
        <div className="rounded-xl p-5 border" style={{ backgroundColor: '#1e293b', borderColor: '#334155' }}>
          <h3 className="text-sm font-semibold mb-2" style={{ color: '#f1f5f9' }}>Token Distribution</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={70} outerRadius={110} dataKey="tokens" paddingAngle={3}>
                {data.map(entry => (
                  <Cell key={entry.model} fill={MODEL_COLORS[entry.model] || '#94a3b8'} stroke="transparent" />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                formatter={(value) => {
                  const item = data.find(d => d.model === value)
                  return <span style={{ color: '#94a3b8', fontSize: 12 }}>{MODEL_LABELS[value] || value}</span>
                }}
                payload={data.map(d => ({ value: d.model, color: MODEL_COLORS[d.model] || '#94a3b8', type: 'circle' as const }))}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Cost distribution pie */}
        <div className="rounded-xl p-5 border" style={{ backgroundColor: '#1e293b', borderColor: '#334155' }}>
          <h3 className="text-sm font-semibold mb-2" style={{ color: '#f1f5f9' }}>Cost Distribution</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={70} outerRadius={110} dataKey="cost" paddingAngle={3}>
                {data.map(entry => (
                  <Cell key={entry.model} fill={MODEL_COLORS[entry.model] || '#94a3b8'} stroke="transparent" />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                formatter={(value) => <span style={{ color: '#94a3b8', fontSize: 12 }}>{MODEL_LABELS[value] || value}</span>}
                payload={data.map(d => ({ value: d.model, color: MODEL_COLORS[d.model] || '#94a3b8', type: 'circle' as const }))}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Details table */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#334155' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: '#1e293b', borderBottom: '1px solid #334155' }}>
              {['Model', 'Tokens', 'Cost', '% of Tokens', '% of Cost'].map(h => (
                <th key={h} className="text-left px-4 py-3 font-medium" style={{ color: '#94a3b8' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr key={row.model} style={{ backgroundColor: idx % 2 === 0 ? '#1e293b' : 'rgba(30,41,59,0.5)', borderBottom: '1px solid #334155' }}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: MODEL_COLORS[row.model] || '#94a3b8' }} />
                    <span style={{ color: '#f1f5f9' }}>{MODEL_LABELS[row.model] || row.model}</span>
                  </div>
                </td>
                <td className="px-4 py-3" style={{ color: '#f1f5f9' }}>{formatTokens(row.tokens)}</td>
                <td className="px-4 py-3 font-medium" style={{ color: '#4ade80' }}>${row.cost.toFixed(2)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#334155', maxWidth: 80 }}>
                      <div className="h-full rounded-full" style={{ width: `${row.pct_tokens}%`, backgroundColor: MODEL_COLORS[row.model] || '#94a3b8' }} />
                    </div>
                    <span style={{ color: '#f1f5f9' }}>{row.pct_tokens.toFixed(1)}%</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#334155', maxWidth: 80 }}>
                      <div className="h-full rounded-full" style={{ width: `${row.pct_cost}%`, backgroundColor: MODEL_COLORS[row.model] || '#94a3b8' }} />
                    </div>
                    <span style={{ color: '#f1f5f9' }}>{row.pct_cost.toFixed(1)}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}


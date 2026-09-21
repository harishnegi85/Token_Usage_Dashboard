'use client'

import { useState } from 'react'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { useDataContext } from '@/lib/DataContext'
import type { TrendBucket } from '@/lib/parseClaudeData'

type Period = 'weekly' | 'monthly'

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

function GrowthBadge({ pct, label }: { pct: number; label: string }) {
  const up = pct > 0
  const neutral = pct === 0
  const color = up ? '#f87171' : neutral ? '#94a3b8' : '#4ade80'
  const bg = up ? 'rgba(248,113,113,0.1)' : neutral ? 'rgba(148,163,184,0.1)' : 'rgba(74,222,128,0.1)'
  const border = up ? 'rgba(248,113,113,0.3)' : neutral ? 'rgba(148,163,184,0.3)' : 'rgba(74,222,128,0.3)'
  const Icon = up ? TrendingUp : neutral ? Minus : TrendingDown
  return (
    <div className="rounded-xl p-4 border flex flex-col gap-2" style={{ backgroundColor: '#1e293b', borderColor: '#334155' }}>
      <div className="text-xs" style={{ color: '#94a3b8' }}>{label}</div>
      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded-full w-fit text-sm font-bold"
        style={{ backgroundColor: bg, border: `1px solid ${border}`, color }}
      >
        <Icon size={14} />
        {neutral ? 'No change' : `${up ? '+' : ''}${pct.toFixed(1)}%`}
      </div>
      <div className="text-xs" style={{ color: '#475569' }}>vs previous period</div>
    </div>
  )
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl p-4 border" style={{ backgroundColor: '#1e293b', borderColor: '#334155' }}>
      <div className="text-xs mb-1" style={{ color: '#94a3b8' }}>{label}</div>
      <div className="text-lg font-bold" style={{ color: '#f1f5f9' }}>{value}</div>
      {sub && <div className="text-xs mt-0.5" style={{ color: '#475569' }}>{sub}</div>}
    </div>
  )
}

const MODEL_COLORS = {
  haiku_tokens: '#22d3ee',
  sonnet_tokens: '#6366f1',
  opus_tokens: '#a855f7',
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg p-3 border text-xs" style={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }}>
      <div className="font-semibold mb-2">{label}</div>
      {payload.map((p: { name: string; value: number; color: string }) => (
        <div key={p.name} className="flex justify-between gap-4">
          <span style={{ color: p.color }}>{p.name}</span>
          <span>{typeof p.value === 'number' && p.name.includes('$')
            ? `$${p.value.toFixed(4)}`
            : formatTokens(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CostTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg p-3 border text-xs" style={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }}>
      <div className="font-semibold mb-1">{label}</div>
      <div className="flex justify-between gap-4">
        <span style={{ color: '#4ade80' }}>Cost</span>
        <span style={{ color: '#4ade80' }}>${payload[0]?.value?.toFixed(4)}</span>
      </div>
    </div>
  )
}

function BucketTable({ data }: { data: TrendBucket[] }) {
  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#334155' }}>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ backgroundColor: '#1e293b', borderBottom: '1px solid #334155' }}>
            {['Period', 'Total Tokens', 'Haiku', 'Sonnet', 'Opus', 'Cost'].map(h => (
              <th key={h} className="text-left px-4 py-3 font-medium" style={{ color: '#94a3b8' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...data].reverse().map((row, idx) => (
            <tr key={row.label} style={{ backgroundColor: idx % 2 === 0 ? '#1e293b' : 'rgba(30,41,59,0.5)', borderBottom: '1px solid #334155' }}>
              <td className="px-4 py-3 font-medium" style={{ color: '#f1f5f9' }}>{row.label}</td>
              <td className="px-4 py-3" style={{ color: '#f1f5f9' }}>{formatTokens(row.tokens)}</td>
              <td className="px-4 py-3" style={{ color: '#22d3ee' }}>{formatTokens(row.haiku_tokens)}</td>
              <td className="px-4 py-3" style={{ color: '#6366f1' }}>{formatTokens(row.sonnet_tokens)}</td>
              <td className="px-4 py-3" style={{ color: '#a855f7' }}>{formatTokens(row.opus_tokens)}</td>
              <td className="px-4 py-3 font-medium" style={{ color: '#4ade80' }}>${row.cost.toFixed(4)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function TrendsPage() {
  const { trends } = useDataContext()
  const [period, setPeriod] = useState<Period>('weekly')

  const data = period === 'weekly' ? trends.weekly : trends.monthly
  const growth = period === 'weekly' ? trends.weekGrowth : trends.monthGrowth
  const currBucket = data[data.length - 1]
  const prevBucket = data[data.length - 2]

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#f1f5f9' }}>Trends</h1>
          <p className="text-sm mt-1" style={{ color: '#94a3b8' }}>
            Week-over-week and month-over-month token usage and cost
          </p>
        </div>

        {/* Period toggle */}
        <div
          className="flex gap-1 p-1 rounded-lg"
          style={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
        >
          {(['weekly', 'monthly'] as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className="px-4 py-2 rounded-md text-sm font-medium transition-all"
              style={{
                backgroundColor: period === p ? '#334155' : 'transparent',
                color: period === p ? '#f1f5f9' : '#94a3b8',
                border: 'none', cursor: 'pointer',
              }}
            >
              {p === 'weekly' ? 'Weekly' : 'Monthly'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={`Current ${period === 'weekly' ? 'Week' : 'Month'} Tokens`}
          value={formatTokens(currBucket?.tokens ?? 0)}
        />
        <StatCard
          label={`Current ${period === 'weekly' ? 'Week' : 'Month'} Cost`}
          value={`$${(currBucket?.cost ?? 0).toFixed(4)}`}
        />
        <StatCard
          label={`Previous ${period === 'weekly' ? 'Week' : 'Month'} Tokens`}
          value={formatTokens(prevBucket?.tokens ?? 0)}
        />
        <StatCard
          label={`Previous ${period === 'weekly' ? 'Week' : 'Month'} Cost`}
          value={`$${(prevBucket?.cost ?? 0).toFixed(4)}`}
        />
      </div>

      {/* Growth badges */}
      <div className="grid grid-cols-2 gap-4">
        <GrowthBadge
          pct={growth.tokens}
          label={`Token usage growth (${period === 'weekly' ? 'week-over-week' : 'month-over-month'})`}
        />
        <GrowthBadge
          pct={growth.cost}
          label={`Cost growth (${period === 'weekly' ? 'week-over-week' : 'month-over-month'})`}
        />
      </div>

      {/* Token stacked bar chart */}
      <div className="rounded-xl p-5 border" style={{ backgroundColor: '#1e293b', borderColor: '#334155' }}>
        <h3 className="text-sm font-semibold mb-4" style={{ color: '#f1f5f9' }}>
          Token Usage by Model — {period === 'weekly' ? 'Last 8 Weeks' : 'Last 6 Months'}
        </h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
            <XAxis dataKey="label" stroke="#475569" tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <YAxis stroke="#475569" tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={formatTokens} />
            <Tooltip content={<CustomTooltip />} />
            <Legend formatter={(v) => <span style={{ color: '#94a3b8', fontSize: 12 }}>
              {v === 'haiku_tokens' ? 'Haiku' : v === 'sonnet_tokens' ? 'Sonnet' : 'Opus'}
            </span>} />
            <Bar dataKey="haiku_tokens"  name="haiku_tokens"  stackId="a" fill={MODEL_COLORS.haiku_tokens}  radius={[0,0,0,0]} />
            <Bar dataKey="sonnet_tokens" name="sonnet_tokens" stackId="a" fill={MODEL_COLORS.sonnet_tokens} radius={[0,0,0,0]} />
            <Bar dataKey="opus_tokens"   name="opus_tokens"   stackId="a" fill={MODEL_COLORS.opus_tokens}   radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Cost line chart */}
      <div className="rounded-xl p-5 border" style={{ backgroundColor: '#1e293b', borderColor: '#334155' }}>
        <h3 className="text-sm font-semibold mb-4" style={{ color: '#f1f5f9' }}>
          Cost Trend ($) — {period === 'weekly' ? 'Last 8 Weeks' : 'Last 6 Months'}
        </h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
            <XAxis dataKey="label" stroke="#475569" tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <YAxis stroke="#475569" tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={v => `$${v.toFixed(2)}`} />
            <Tooltip content={<CostTooltip />} />
            <Line
              type="monotone" dataKey="cost" stroke="#4ade80" strokeWidth={2}
              dot={{ fill: '#4ade80', r: 4 }} activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Detail table */}
      <div>
        <h3 className="text-sm font-semibold mb-3" style={{ color: '#f1f5f9' }}>
          Breakdown by {period === 'weekly' ? 'Week' : 'Month'}
        </h3>
        <BucketTable data={data} />
      </div>
    </div>
  )
}

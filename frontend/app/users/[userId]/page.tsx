'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Coins, DollarSign, BarChart2, Zap } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import ModelMixChart from '@/components/ModelMixChart'

const API = 'http://localhost:8080'

interface UserSummary {
  user_id: string
  total_tokens: number
  input_tokens: number
  output_tokens: number
  cost_usd: number
  primary_model: string
  cache_hit_rate: number
  request_count: number
  optimization_flags: string[]
}

interface DailyPoint {
  date: string
  tokens: number
  cost: number
}

interface ModelMix {
  model: string
  tokens: number
  cost: number
  pct: number
}

interface UserDetail {
  user_id: string
  summary: UserSummary
  daily: DailyPoint[]
  model_mix: ModelMix[]
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

const FLAG_CONFIG: Record<string, { label: string; color: string; bg: string; desc: string }> = {
  low_cache_rate: {
    label: 'Low Cache Rate',
    color: '#fbbf24',
    bg: 'rgba(251,191,36,0.15)',
    desc: 'Cache hit rate below 15%. Consider enabling prompt caching.',
  },
  expensive_model: {
    label: 'Costly Model',
    color: '#f87171',
    bg: 'rgba(248,113,113,0.15)',
    desc: 'Using an expensive model with short outputs. Consider Haiku for simple tasks.',
  },
  long_prompts: {
    label: 'Long Prompts',
    color: '#a855f7',
    bg: 'rgba(168,85,247,0.15)',
    desc: 'Average input exceeds 6,000 tokens. Trimming prompts could reduce costs.',
  },
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg p-2 border text-xs" style={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }}>
      <div className="mb-1" style={{ color: '#94a3b8' }}>{label}</div>
      <div>Tokens: <span className="font-medium">{formatTokens(payload[0]?.value || 0)}</span></div>
      {payload[1] && <div>Cost: <span className="font-medium" style={{ color: '#4ade80' }}>${(payload[1].value || 0).toFixed(4)}</span></div>}
    </div>
  )
}

export default function UserDetailPage() {
  const params = useParams()
  const router = useRouter()
  const userId = decodeURIComponent(params.userId as string)

  const [detail, setDetail] = useState<UserDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) return
    fetch(`${API}/api/users/${encodeURIComponent(userId)}`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(setDetail)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [userId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-sm" style={{ color: '#94a3b8' }}>Loading user details...</div>
      </div>
    )
  }

  if (error || !detail) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-sm" style={{ color: '#f87171' }}>
          Failed to load user: {error}
        </div>
      </div>
    )
  }

  const { summary, daily, model_mix } = detail
  const formattedDaily = daily.map(d => ({ ...d, date: formatDate(d.date) }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-xs mb-3 hover:opacity-80 transition-opacity"
          style={{ color: '#94a3b8' }}
        >
          <ArrowLeft size={14} />
          Back to Users
        </button>
        <h1 className="text-xl font-bold" style={{ color: '#f1f5f9' }}>
          {userId.split('@')[0].charAt(0).toUpperCase() + userId.split('@')[0].slice(1)}
        </h1>
        <p className="text-sm mt-0.5" style={{ color: '#94a3b8' }}>{userId}</p>
      </div>

      {/* KPI mini-cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Tokens', value: formatTokens(summary.total_tokens), icon: Coins },
          { label: 'Total Cost', value: `$${summary.cost_usd.toFixed(2)}`, icon: DollarSign },
          { label: 'Requests', value: summary.request_count.toLocaleString(), icon: BarChart2 },
          { label: 'Cache Hit Rate', value: `${(summary.cache_hit_rate * 100).toFixed(1)}%`, icon: Zap },
        ].map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="rounded-xl p-4 border"
            style={{ backgroundColor: '#1e293b', borderColor: '#334155' }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs" style={{ color: '#94a3b8' }}>{label}</span>
              <Icon size={14} color="#6366f1" />
            </div>
            <div className="text-lg font-bold" style={{ color: '#f1f5f9' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Daily Usage Chart */}
      <div
        className="rounded-xl p-5 border"
        style={{ backgroundColor: '#1e293b', borderColor: '#334155' }}
      >
        <h3 className="text-sm font-semibold mb-4" style={{ color: '#f1f5f9' }}>Daily Usage</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={formattedDaily} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
            <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: '#334155' }} tickLine={false} interval={4} />
            <YAxis tickFormatter={formatTokens} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={48} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="tokens" stroke="#6366f1" strokeWidth={2} dot={false} name="Tokens" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Model Mix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ModelMixChart data={model_mix} title="Model Mix" />

        {/* Optimization Flags */}
        <div
          className="rounded-xl p-5 border"
          style={{ backgroundColor: '#1e293b', borderColor: '#334155' }}
        >
          <h3 className="text-sm font-semibold mb-4" style={{ color: '#f1f5f9' }}>
            Optimization Flags
          </h3>
          {summary.optimization_flags.length === 0 ? (
            <div className="flex items-center gap-2 text-sm" style={{ color: '#4ade80' }}>
              <span>✓</span>
              <span>No optimization flags — this user looks efficient!</span>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {summary.optimization_flags.map(flag => {
                const cfg = FLAG_CONFIG[flag]
                if (!cfg) return null
                return (
                  <div
                    key={flag}
                    className="flex items-start gap-3 p-3 rounded-lg"
                    style={{ backgroundColor: cfg.bg }}
                  >
                    <div
                      className="text-xs font-medium px-2 py-0.5 rounded-full shrink-0 mt-0.5"
                      style={{ color: cfg.color, backgroundColor: `${cfg.color}22` }}
                    >
                      {cfg.label}
                    </div>
                    <p className="text-sm" style={{ color: '#94a3b8' }}>{cfg.desc}</p>
                  </div>
                )
              })}
            </div>
          )}

          {/* Token breakdown */}
          <div
            className="mt-4 pt-4 border-t grid grid-cols-2 gap-3"
            style={{ borderColor: '#334155' }}
          >
            {[
              { label: 'Input Tokens', value: formatTokens(summary.input_tokens) },
              { label: 'Output Tokens', value: formatTokens(summary.output_tokens) },
            ].map(({ label, value }) => (
              <div key={label}>
                <div className="text-xs" style={{ color: '#94a3b8' }}>{label}</div>
                <div className="text-sm font-semibold" style={{ color: '#f1f5f9' }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

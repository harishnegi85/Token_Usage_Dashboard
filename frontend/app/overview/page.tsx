'use client'

import { useEffect, useState } from 'react'
import { Coins, DollarSign, Users, Zap, BarChart2, TrendingUp } from 'lucide-react'
import KPICard from '@/components/KPICard'
import TokenTimeSeriesChart from '@/components/TokenTimeSeriesChart'
import ModelMixChart from '@/components/ModelMixChart'

const API = 'http://localhost:8080'

interface KPIs {
  total_tokens: number
  total_cost_usd: number
  active_users: number
  cache_hit_rate: number
  avg_tokens_per_request: number
  period_vs_previous: {
    total_tokens_delta_pct: number
    total_cost_delta_pct: number
  }
}

interface TimeSeriesPoint {
  date: string
  haiku_tokens: number
  sonnet_tokens: number
  opus_tokens: number
  total_cost: number
}

interface OverviewData {
  kpis: KPIs
  time_series: TimeSeriesPoint[]
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

export default function OverviewPage() {
  const [data, setData] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`${API}/api/overview?period=30d`)
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
        <div className="text-sm" style={{ color: '#94a3b8' }}>Loading overview...</div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-sm" style={{ color: '#f87171' }}>
          Failed to load data: {error || 'Unknown error'}. Is the backend running at localhost:8080?
        </div>
      </div>
    )
  }

  const { kpis, time_series } = data
  const tokensDelta = kpis.period_vs_previous.total_tokens_delta_pct
  const costDelta = kpis.period_vs_previous.total_cost_delta_pct

  // Build model mix from time series totals
  const modelMixData = [
    {
      model: 'claude-haiku-4-5',
      tokens: time_series.reduce((s, d) => s + d.haiku_tokens, 0),
      cost: time_series.reduce((s, d) => s + d.total_cost * (d.haiku_tokens / (d.haiku_tokens + d.sonnet_tokens + d.opus_tokens || 1)), 0),
    },
    {
      model: 'claude-sonnet-4-6',
      tokens: time_series.reduce((s, d) => s + d.sonnet_tokens, 0),
      cost: time_series.reduce((s, d) => s + d.total_cost * (d.sonnet_tokens / (d.haiku_tokens + d.sonnet_tokens + d.opus_tokens || 1)), 0),
    },
    {
      model: 'claude-opus-4-8',
      tokens: time_series.reduce((s, d) => s + d.opus_tokens, 0),
      cost: time_series.reduce((s, d) => s + d.total_cost * (d.opus_tokens / (d.haiku_tokens + d.sonnet_tokens + d.opus_tokens || 1)), 0),
    },
  ].filter(m => m.tokens > 0)

  const totalModelTokens = modelMixData.reduce((s, m) => s + m.tokens, 0)
  const opusPct = modelMixData.find(m => m.model === 'claude-opus-4-8')
    ? ((modelMixData.find(m => m.model === 'claude-opus-4-8')!.tokens / totalModelTokens) * 100).toFixed(1)
    : '0'
  const haikuPct = modelMixData.find(m => m.model === 'claude-haiku-4-5')
    ? ((modelMixData.find(m => m.model === 'claude-haiku-4-5')!.tokens / totalModelTokens) * 100).toFixed(1)
    : '0'

  const insights = [
    `Haiku handles ${haikuPct}% of all token volume â€” the most cost-efficient tier.`,
    `Opus accounts for ${opusPct}% of tokens but a disproportionate share of cost.`,
    `Cache hit rate of ${(kpis.cache_hit_rate * 100).toFixed(1)}% â€” ${kpis.cache_hit_rate > 0.3 ? 'healthy' : 'room for improvement with prompt caching'}.`,
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold" style={{ color: '#f1f5f9' }}>Overview</h1>
        <p className="text-sm mt-1" style={{ color: '#94a3b8' }}>Last 30 days of token usage</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
        <KPICard
          title="Total Tokens"
          value={formatTokens(kpis.total_tokens)}
          delta={`${Math.abs(tokensDelta).toFixed(1)}%`}
          deltaPositive={tokensDelta <= 0}
          icon={Coins}
        />
        <KPICard
          title="Total Cost"
          value={`$${kpis.total_cost_usd.toFixed(2)}`}
          delta={`${Math.abs(costDelta).toFixed(1)}%`}
          deltaPositive={costDelta <= 0}
          icon={DollarSign}
        />
        <KPICard
          title="Active Users"
          value={kpis.active_users.toString()}
          icon={Users}
          subtitle="in last 30 days"
        />
        <KPICard
          title="Cache Hit Rate"
          value={`${(kpis.cache_hit_rate * 100).toFixed(1)}%`}
          icon={Zap}
          subtitle="cache_read / (input + cache_read)"
        />
        <KPICard
          title="Avg Tokens/Request"
          value={formatTokens(Math.round(kpis.avg_tokens_per_request))}
          icon={BarChart2}
          subtitle="input + output"
        />
      </div>

      {/* Time Series Chart */}
      <TokenTimeSeriesChart data={time_series} />

      {/* Model Mix + Quick Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ModelMixChart data={modelMixData} title="Model Distribution (by tokens)" />

        <div
          className="rounded-xl p-5 border"
          style={{ backgroundColor: '#1e293b', borderColor: '#334155' }}
        >
          <h3 className="text-sm font-semibold mb-4" style={{ color: '#f1f5f9' }}>
            Quick Insights
          </h3>
          <div className="flex flex-col gap-3">
            {insights.map((insight, i) => (
              <div key={i} className="flex items-start gap-3">
                <div
                  className="flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold shrink-0 mt-0.5"
                  style={{ backgroundColor: 'rgba(99,102,241,0.2)', color: '#6366f1' }}
                >
                  {i + 1}
                </div>
                <p className="text-sm" style={{ color: '#94a3b8' }}>{insight}</p>
              </div>
            ))}
          </div>

          <div
            className="mt-4 pt-4 border-t"
            style={{ borderColor: '#334155' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={14} color="#4ade80" />
              <span className="text-xs font-medium" style={{ color: '#4ade80' }}>Period Summary</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs" style={{ color: '#94a3b8' }}>Avg daily cost</div>
                <div className="text-sm font-semibold" style={{ color: '#f1f5f9' }}>
                  ${(kpis.total_cost_usd / 30).toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-xs" style={{ color: '#94a3b8' }}>Avg tokens/day</div>
                <div className="text-sm font-semibold" style={{ color: '#f1f5f9' }}>
                  {formatTokens(Math.round(kpis.total_tokens / 30))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


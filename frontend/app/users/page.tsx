'use client'

import { useState } from 'react'
import { ArrowLeft, Coins, DollarSign, BarChart2, Zap } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import UserTable from '@/components/UserTable'
import ModelMixChart from '@/components/ModelMixChart'
import { useDataContext } from '@/lib/DataContext'
import type { UserSummary } from '@/lib/parseClaudeData'

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

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg p-2 border text-xs" style={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }}>
      <div className="mb-1" style={{ color: '#94a3b8' }}>{label}</div>
      <div>Tokens: <span className="font-medium">{formatTokens(payload[0]?.value || 0)}</span></div>
    </div>
  )
}

function UserDetail({ user, onBack, overview }: { user: UserSummary; onBack: () => void; overview: { kpis: { total_tokens: number; total_cost_usd: number }; time_series: { date: string; haiku_tokens: number; sonnet_tokens: number; opus_tokens: number }[] } }) {
  const dailyData = overview.time_series.map(d => ({
    date: formatDate(d.date),
    tokens: d.haiku_tokens + d.sonnet_tokens + d.opus_tokens,
  }))

  const modelMix = [
    { model: 'claude-haiku-4-5',  tokens: overview.time_series.reduce((s, d) => s + d.haiku_tokens, 0),  cost: 0 },
    { model: 'claude-sonnet-4-6', tokens: overview.time_series.reduce((s, d) => s + d.sonnet_tokens, 0), cost: 0 },
    { model: 'claude-opus-4-8',   tokens: overview.time_series.reduce((s, d) => s + d.opus_tokens, 0),   cost: 0 },
  ].filter(m => m.tokens > 0)

  return (
    <div className="space-y-6">
      <div>
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-xs mb-3 hover:opacity-80 transition-opacity"
          style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          <ArrowLeft size={14} />
          Back to Users
        </button>
        <h1 className="text-xl font-bold" style={{ color: '#f1f5f9' }}>
          {user.user_id.charAt(0).toUpperCase() + user.user_id.slice(1)}
        </h1>
        <p className="text-sm mt-0.5" style={{ color: '#94a3b8' }}>{user.user_id}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Tokens', value: formatTokens(user.total_tokens), icon: Coins },
          { label: 'Total Cost', value: `$${user.cost_usd.toFixed(2)}`, icon: DollarSign },
          { label: 'Requests', value: user.request_count.toLocaleString(), icon: BarChart2 },
          { label: 'Cache Hit Rate', value: `${(user.cache_hit_rate * 100).toFixed(1)}%`, icon: Zap },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-xl p-4 border" style={{ backgroundColor: '#1e293b', borderColor: '#334155' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs" style={{ color: '#94a3b8' }}>{label}</span>
              <Icon size={14} color="#6366f1" />
            </div>
            <div className="text-lg font-bold" style={{ color: '#f1f5f9' }}>{value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl p-5 border" style={{ backgroundColor: '#1e293b', borderColor: '#334155' }}>
        <h3 className="text-sm font-semibold mb-4" style={{ color: '#f1f5f9' }}>Daily Usage</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={dailyData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
            <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: '#334155' }} tickLine={false} interval={4} />
            <YAxis tickFormatter={formatTokens} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={48} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="tokens" stroke="#6366f1" strokeWidth={2} dot={false} name="Tokens" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ModelMixChart data={modelMix} title="Model Mix" />

        <div className="rounded-xl p-5 border" style={{ backgroundColor: '#1e293b', borderColor: '#334155' }}>
          <h3 className="text-sm font-semibold mb-4" style={{ color: '#f1f5f9' }}>Optimization Flags</h3>
          {user.optimization_flags.length === 0 ? (
            <div className="flex items-center gap-2 text-sm" style={{ color: '#4ade80' }}>
              <span>✓</span>
              <span>No optimization flags — usage looks efficient!</span>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {user.optimization_flags.map(flag => {
                const cfg = FLAG_CONFIG[flag]
                if (!cfg) return null
                return (
                  <div key={flag} className="flex items-start gap-3 p-3 rounded-lg" style={{ backgroundColor: cfg.bg }}>
                    <div className="text-xs font-medium px-2 py-0.5 rounded-full shrink-0 mt-0.5" style={{ color: cfg.color, backgroundColor: `${cfg.color}22` }}>
                      {cfg.label}
                    </div>
                    <p className="text-sm" style={{ color: '#94a3b8' }}>{cfg.desc}</p>
                  </div>
                )
              })}
            </div>
          )}
          <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-3" style={{ borderColor: '#334155' }}>
            {[
              { label: 'Input Tokens', value: formatTokens(user.input_tokens) },
              { label: 'Output Tokens', value: formatTokens(user.output_tokens) },
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

export default function UsersPage() {
  const { users, overview } = useDataContext()
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)

  const selectedUser = selectedUserId ? users.find(u => u.user_id === selectedUserId) ?? null : null

  if (selectedUser) {
    return (
      <UserDetail
        user={selectedUser}
        onBack={() => setSelectedUserId(null)}
        overview={overview}
      />
    )
  }

  const totalCost = users.reduce((s, u) => s + u.cost_usd, 0)
  const flaggedCount = users.filter(u => u.optimization_flags.length > 0).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold" style={{ color: '#f1f5f9' }}>Users</h1>
        <p className="text-sm mt-1" style={{ color: '#94a3b8' }}>
          {users.length} active user{users.length !== 1 ? 's' : ''} in the last 30 days
          {users.length > 0 && ' — click a row to drill in'}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Users', value: users.length.toString() },
          { label: 'Total Cost (30d)', value: `$${totalCost.toFixed(2)}` },
          { label: 'Users with Flags', value: `${flaggedCount} / ${users.length}` },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl p-4 border" style={{ backgroundColor: '#1e293b', borderColor: '#334155' }}>
            <div className="text-xs mb-1" style={{ color: '#94a3b8' }}>{label}</div>
            <div className="text-lg font-bold" style={{ color: '#f1f5f9' }}>{value}</div>
          </div>
        ))}
      </div>

      <UserTable users={users} onRowClick={setSelectedUserId} />
    </div>
  )
}

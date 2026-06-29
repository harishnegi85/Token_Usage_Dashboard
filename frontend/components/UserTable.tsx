'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronUp, ChevronDown } from 'lucide-react'

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

interface Props {
  users: UserSummary[]
}

type SortKey = keyof Pick<UserSummary, 'request_count' | 'input_tokens' | 'output_tokens' | 'cost_usd' | 'cache_hit_rate'>

const FLAG_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  low_cache_rate: { label: 'Low Cache', color: '#fbbf24', bg: 'rgba(251,191,36,0.15)' },
  expensive_model: { label: 'Costly Model', color: '#f87171', bg: 'rgba(248,113,113,0.15)' },
  long_prompts: { label: 'Long Prompts', color: '#a855f7', bg: 'rgba(168,85,247,0.15)' },
}

const MODEL_COLORS: Record<string, string> = {
  'claude-haiku-4-5': '#22d3ee',
  'claude-sonnet-4-6': '#6366f1',
  'claude-opus-4-8': '#a855f7',
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

function shortModel(model: string): string {
  if (model.includes('haiku')) return 'Haiku'
  if (model.includes('sonnet')) return 'Sonnet'
  if (model.includes('opus')) return 'Opus'
  return model
}

export default function UserTable({ users }: Props) {
  const router = useRouter()
  const [sortKey, setSortKey] = useState<SortKey>('cost_usd')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const sorted = [...users].sort((a, b) => {
    const av = a[sortKey]
    const bv = b[sortKey]
    return sortDir === 'desc' ? (bv as number) - (av as number) : (av as number) - (bv as number)
  })

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ChevronUp size={12} style={{ color: '#475569' }} />
    return sortDir === 'desc'
      ? <ChevronDown size={12} style={{ color: '#6366f1' }} />
      : <ChevronUp size={12} style={{ color: '#6366f1' }} />
  }

  const columns: { key: SortKey; label: string }[] = [
    { key: 'request_count', label: 'Requests' },
    { key: 'input_tokens', label: 'Input Tokens' },
    { key: 'output_tokens', label: 'Output Tokens' },
    { key: 'cost_usd', label: 'Cost' },
    { key: 'cache_hit_rate', label: 'Cache Hit Rate' },
  ]

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#334155' }}>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ backgroundColor: '#1e293b', borderBottom: '1px solid #334155' }}>
            <th className="text-left px-4 py-3 font-medium" style={{ color: '#94a3b8' }}>
              User
            </th>
            {columns.map(col => (
              <th
                key={col.key}
                className="text-right px-4 py-3 font-medium cursor-pointer select-none"
                style={{ color: '#94a3b8' }}
                onClick={() => handleSort(col.key)}
              >
                <div className="flex items-center justify-end gap-1">
                  {col.label}
                  <SortIcon col={col.key} />
                </div>
              </th>
            ))}
            <th className="text-left px-4 py-3 font-medium" style={{ color: '#94a3b8' }}>
              Model
            </th>
            <th className="text-left px-4 py-3 font-medium" style={{ color: '#94a3b8' }}>
              Flags
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((user, idx) => (
            <tr
              key={user.user_id}
              className="cursor-pointer transition-colors"
              style={{
                backgroundColor: idx % 2 === 0 ? '#1e293b' : 'rgba(30,41,59,0.5)',
                borderBottom: '1px solid #334155',
              }}
              onClick={() => router.push(`/users/${encodeURIComponent(user.user_id)}`)}
              onMouseEnter={e => {
                (e.currentTarget as HTMLTableRowElement).style.backgroundColor = 'rgba(99,102,241,0.08)'
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLTableRowElement).style.backgroundColor =
                  idx % 2 === 0 ? '#1e293b' : 'rgba(30,41,59,0.5)'
              }}
            >
              <td className="px-4 py-3" style={{ color: '#f1f5f9' }}>
                <div className="font-medium">{user.user_id.split('@')[0]}</div>
                <div className="text-xs" style={{ color: '#94a3b8' }}>{user.user_id}</div>
              </td>
              <td className="px-4 py-3 text-right" style={{ color: '#f1f5f9' }}>
                {user.request_count.toLocaleString()}
              </td>
              <td className="px-4 py-3 text-right" style={{ color: '#f1f5f9' }}>
                {formatTokens(user.input_tokens)}
              </td>
              <td className="px-4 py-3 text-right" style={{ color: '#f1f5f9' }}>
                {formatTokens(user.output_tokens)}
              </td>
              <td className="px-4 py-3 text-right font-medium" style={{ color: '#4ade80' }}>
                ${user.cost_usd.toFixed(2)}
              </td>
              <td className="px-4 py-3 text-right">
                <span
                  style={{
                    color: user.cache_hit_rate > 0.4
                      ? '#4ade80'
                      : user.cache_hit_rate > 0.2
                      ? '#fbbf24'
                      : '#f87171',
                  }}
                >
                  {(user.cache_hit_rate * 100).toFixed(1)}%
                </span>
              </td>
              <td className="px-4 py-3">
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{
                    color: MODEL_COLORS[user.primary_model] || '#94a3b8',
                    backgroundColor: `${MODEL_COLORS[user.primary_model] || '#94a3b8'}22`,
                  }}
                >
                  {shortModel(user.primary_model)}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  {user.optimization_flags.map(flag => {
                    const cfg = FLAG_CONFIG[flag]
                    if (!cfg) return null
                    return (
                      <span
                        key={flag}
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ color: cfg.color, backgroundColor: cfg.bg }}
                      >
                        {cfg.label}
                      </span>
                    )
                  })}
                  {user.optimization_flags.length === 0 && (
                    <span className="text-xs" style={{ color: '#475569' }}>—</span>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

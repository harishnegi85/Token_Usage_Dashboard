'use client'

import { useEffect, useState } from 'react'
import UserTable from '@/components/UserTable'

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

export default function UsersPage() {
  const [users, setUsers] = useState<UserSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`${API}/api/users`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(setUsers)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-sm" style={{ color: '#94a3b8' }}>Loading users...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-sm" style={{ color: '#f87171' }}>
          Failed to load users: {error}. Is the backend running at localhost:8080?
        </div>
      </div>
    )
  }

  const totalCost = users.reduce((s, u) => s + u.cost_usd, 0)
  const flaggedCount = users.filter(u => u.optimization_flags.length > 0).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold" style={{ color: '#f1f5f9' }}>Users</h1>
        <p className="text-sm mt-1" style={{ color: '#94a3b8' }}>
          {users.length} active users in the last 30 days â€” click a row to drill in
        </p>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Users', value: users.length.toString() },
          { label: 'Total Cost (30d)', value: `$${totalCost.toFixed(2)}` },
          { label: 'Users with Flags', value: `${flaggedCount} / ${users.length}` },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="rounded-xl p-4 border"
            style={{ backgroundColor: '#1e293b', borderColor: '#334155' }}
          >
            <div className="text-xs mb-1" style={{ color: '#94a3b8' }}>{label}</div>
            <div className="text-lg font-bold" style={{ color: '#f1f5f9' }}>{value}</div>
          </div>
        ))}
      </div>

      <UserTable users={users} />
    </div>
  )
}


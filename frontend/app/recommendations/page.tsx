'use client'

import { useEffect, useState } from 'react'
import { TrendingDown } from 'lucide-react'
import RecommendationCard from '@/components/RecommendationCard'

const API = 'http://localhost:8080'

interface Recommendation {
  user_id: string
  type: 'enable_caching' | 'right_size_model' | 'shorten_prompts'
  severity: 'high' | 'medium' | 'low'
  title: string
  description: string
  estimated_monthly_saving_usd: number
}

export default function RecommendationsPage() {
  const [recs, setRecs] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`${API}/api/recommendations`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((data: Recommendation[]) => {
        const sorted = [...data].sort(
          (a, b) => b.estimated_monthly_saving_usd - a.estimated_monthly_saving_usd
        )
        setRecs(sorted)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-sm" style={{ color: '#94a3b8' }}>Loading recommendations...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-sm" style={{ color: '#f87171' }}>
          Failed to load recommendations: {error}
        </div>
      </div>
    )
  }

  const totalSaving = recs.reduce((s, r) => s + r.estimated_monthly_saving_usd, 0)
  const highRecs = recs.filter(r => r.severity === 'high')
  const mediumRecs = recs.filter(r => r.severity === 'medium')
  const lowRecs = recs.filter(r => r.severity === 'low')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold" style={{ color: '#f1f5f9' }}>Recommendations</h1>
        <p className="text-sm mt-1" style={{ color: '#94a3b8' }}>
          Optimization opportunities based on usage patterns
        </p>
      </div>

      {/* Total savings header card */}
      <div
        className="rounded-xl p-5 border flex items-center justify-between"
        style={{
          backgroundColor: 'rgba(74,222,128,0.08)',
          borderColor: 'rgba(74,222,128,0.3)',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-xl"
            style={{ backgroundColor: 'rgba(74,222,128,0.15)' }}
          >
            <TrendingDown size={20} color="#4ade80" />
          </div>
          <div>
            <div className="text-sm font-medium" style={{ color: '#94a3b8' }}>
              Total potential monthly savings
            </div>
            <div className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>
              Across {recs.length} recommendations for {new Set(recs.map(r => r.user_id)).size} users
            </div>
          </div>
        </div>
        <div className="text-3xl font-bold" style={{ color: '#4ade80' }}>
          ${totalSaving.toFixed(2)}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'High Priority', count: highRecs.length, color: '#f87171', bg: 'rgba(248,113,113,0.1)' },
          { label: 'Medium Priority', count: mediumRecs.length, color: '#fbbf24', bg: 'rgba(251,191,36,0.1)' },
          { label: 'Low Priority', count: lowRecs.length, color: '#4ade80', bg: 'rgba(74,222,128,0.1)' },
        ].map(({ label, count, color, bg }) => (
          <div key={label} className="rounded-xl p-4 border" style={{ backgroundColor: '#1e293b', borderColor: '#334155' }}>
            <div className="text-xs mb-1" style={{ color: '#94a3b8' }}>{label}</div>
            <div className="text-2xl font-bold" style={{ color }}>{count}</div>
          </div>
        ))}
      </div>

      {/* High severity */}
      {highRecs.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#f87171' }} />
            <h2 className="text-sm font-semibold" style={{ color: '#f87171' }}>
              High Priority ({highRecs.length})
            </h2>
          </div>
          <div className="flex flex-col gap-3">
            {highRecs.map((rec, i) => (
              <RecommendationCard key={`high-${i}`} rec={rec} />
            ))}
          </div>
        </div>
      )}

      {/* Medium severity */}
      {mediumRecs.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#fbbf24' }} />
            <h2 className="text-sm font-semibold" style={{ color: '#fbbf24' }}>
              Medium Priority ({mediumRecs.length})
            </h2>
          </div>
          <div className="flex flex-col gap-3">
            {mediumRecs.map((rec, i) => (
              <RecommendationCard key={`medium-${i}`} rec={rec} />
            ))}
          </div>
        </div>
      )}

      {/* Low severity */}
      {lowRecs.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#4ade80' }} />
            <h2 className="text-sm font-semibold" style={{ color: '#4ade80' }}>
              Low Priority ({lowRecs.length})
            </h2>
          </div>
          <div className="flex flex-col gap-3">
            {lowRecs.map((rec, i) => (
              <RecommendationCard key={`low-${i}`} rec={rec} />
            ))}
          </div>
        </div>
      )}

      {recs.length === 0 && (
        <div className="text-center py-12" style={{ color: '#94a3b8' }}>
          No recommendations at this time. Your organization is using Claude efficiently!
        </div>
      )}
    </div>
  )
}


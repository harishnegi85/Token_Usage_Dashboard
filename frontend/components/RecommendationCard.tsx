import { AlertTriangle, TrendingDown, Scissors, Database } from 'lucide-react'

interface Recommendation {
  user_id: string
  type: 'enable_caching' | 'right_size_model' | 'shorten_prompts'
  severity: 'high' | 'medium' | 'low'
  title: string
  description: string
  estimated_monthly_saving_usd: number
}

interface Props {
  rec: Recommendation
}

const SEVERITY_CONFIG = {
  high: { color: '#f87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.3)', label: 'High' },
  medium: { color: '#fbbf24', bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.3)', label: 'Medium' },
  low: { color: '#4ade80', bg: 'rgba(74,222,128,0.12)', border: 'rgba(74,222,128,0.3)', label: 'Low' },
}

const TYPE_CONFIG = {
  enable_caching: {
    icon: Database,
    color: '#22d3ee',
    bg: 'rgba(34,211,238,0.12)',
  },
  right_size_model: {
    icon: TrendingDown,
    color: '#6366f1',
    bg: 'rgba(99,102,241,0.12)',
  },
  shorten_prompts: {
    icon: Scissors,
    color: '#a855f7',
    bg: 'rgba(168,85,247,0.12)',
  },
}

export default function RecommendationCard({ rec }: Props) {
  const severity = SEVERITY_CONFIG[rec.severity]
  const typeConfig = TYPE_CONFIG[rec.type]
  const Icon = typeConfig.icon

  return (
    <div
      className="rounded-xl p-4 border flex flex-col gap-3"
      style={{ backgroundColor: '#1e293b', borderColor: '#334155' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0 mt-0.5"
            style={{ backgroundColor: typeConfig.bg }}
          >
            <Icon size={16} color={typeConfig.color} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-sm" style={{ color: '#f1f5f9' }}>
                {rec.title}
              </span>
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ color: severity.color, backgroundColor: severity.bg }}
              >
                {severity.label}
              </span>
            </div>
            <div className="text-xs mb-2" style={{ color: '#94a3b8' }}>
              {rec.user_id}
            </div>
            <p className="text-sm" style={{ color: '#94a3b8' }}>
              {rec.description}
            </p>
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="text-xs mb-0.5" style={{ color: '#94a3b8' }}>
            Est. monthly savings
          </div>
          <div className="text-lg font-bold" style={{ color: '#4ade80' }}>
            ${rec.estimated_monthly_saving_usd.toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  )
}

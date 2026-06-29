import { LucideIcon } from 'lucide-react'

interface KPICardProps {
  title: string
  value: string
  delta?: string
  deltaPositive?: boolean
  icon: LucideIcon
  subtitle?: string
}

export default function KPICard({ title, value, delta, deltaPositive, icon: Icon, subtitle }: KPICardProps) {
  return (
    <div
      className="rounded-xl p-5 border flex flex-col gap-3"
      style={{
        backgroundColor: '#1e293b',
        borderColor: '#334155',
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider" style={{ color: '#94a3b8' }}>
          {title}
        </span>
        <div
          className="flex items-center justify-center w-8 h-8 rounded-lg"
          style={{ backgroundColor: 'rgba(99,102,241,0.15)' }}
        >
          <Icon size={16} color="#6366f1" />
        </div>
      </div>

      <div>
        <div className="text-2xl font-bold" style={{ color: '#f1f5f9' }}>
          {value}
        </div>
        {subtitle && (
          <div className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>
            {subtitle}
          </div>
        )}
      </div>

      {delta !== undefined && (
        <div className="flex items-center gap-1">
          <span
            className="text-xs font-medium px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: deltaPositive
                ? 'rgba(74,222,128,0.15)'
                : 'rgba(248,113,113,0.15)',
              color: deltaPositive ? '#4ade80' : '#f87171',
            }}
          >
            {deltaPositive ? '▲' : '▼'} {delta}
          </span>
          <span className="text-xs" style={{ color: '#94a3b8' }}>
            vs prev period
          </span>
        </div>
      )}
    </div>
  )
}

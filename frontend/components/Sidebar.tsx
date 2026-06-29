'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart3, Users, PieChart, Lightbulb, Zap } from 'lucide-react'

const navItems = [
  { href: '/overview', label: 'Overview', icon: BarChart3 },
  { href: '/users', label: 'Users', icon: Users },
  { href: '/model-mix', label: 'Model Mix', icon: PieChart },
  { href: '/recommendations', label: 'Recommendations', icon: Lightbulb },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside
      className="flex flex-col w-56 shrink-0 h-screen border-r"
      style={{
        backgroundColor: '#1e293b',
        borderColor: '#334155',
      }}
    >
      {/* Logo / Title */}
      <div className="flex items-center gap-2 px-4 py-5 border-b" style={{ borderColor: '#334155' }}>
        <div
          className="flex items-center justify-center w-8 h-8 rounded-lg"
          style={{ backgroundColor: '#6366f1' }}
        >
          <Zap size={16} color="#fff" />
        </div>
        <span className="font-semibold text-sm" style={{ color: '#f1f5f9' }}>
          Token Dashboard
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1 p-3 flex-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                backgroundColor: isActive ? 'rgba(99,102,241,0.2)' : 'transparent',
                color: isActive ? '#6366f1' : '#94a3b8',
              }}
            >
              <Icon size={16} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t text-xs" style={{ borderColor: '#334155', color: '#94a3b8' }}>
        30-day rolling window
      </div>
    </aside>
  )
}

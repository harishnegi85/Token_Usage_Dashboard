'use client'

import { useRef, useState } from 'react'
import { FolderOpen, BarChart2, User, CheckCircle, RefreshCw, AlertCircle } from 'lucide-react'
import { useDataContext } from '@/lib/DataContext'

export default function FolderPicker() {
  const { viewMode, setViewMode, dataSource, folderName, records, loading, error, loadFolder, loadFiles } = useDataContext()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pendingHandle, setPendingHandle] = useState<FileSystemDirectoryHandle | null>(null)
  const [pendingName, setPendingName] = useState<string | null>(null)

  async function handlePickFolder() {
    const win = window as Window & { showDirectoryPicker?: (opts?: { mode?: string }) => Promise<FileSystemDirectoryHandle> }
    if (typeof win.showDirectoryPicker === 'function') {
      try {
        const dirHandle = await win.showDirectoryPicker({ mode: 'read' })
        setPendingHandle(dirHandle)
        setPendingName(dirHandle.name)
      } catch {
        // user cancelled
      }
    } else {
      fileInputRef.current?.click()
    }
  }

  async function handleConfirmLoad() {
    if (!pendingHandle) return
    const h = pendingHandle
    setPendingHandle(null)
    setPendingName(null)
    await loadFolder(h)
  }

  async function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      await loadFiles(e.target.files)
    }
  }

  function handleTabClick(tab: 'demo' | 'user') {
    if (tab === 'user' && dataSource === 'mock' && !pendingName && !loading) {
      // Trigger folder picker immediately when switching to user tab without data
      handlePickFolder()
    }
    setViewMode(tab)
  }

  const dates = records.map(r => r.date).sort()
  const from = dates[0] ?? '—'
  const to = dates[dates.length - 1] ?? '—'
  const hasRealData = dataSource === 'folder' && records.length > 0

  return (
    <div className="flex items-center justify-between mb-5 gap-4 flex-wrap">
      {/* Tab switcher */}
      <div
        className="flex gap-1 p-1 rounded-lg"
        style={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
      >
        <button
          onClick={() => setViewMode('demo')}
          className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all"
          style={{
            backgroundColor: viewMode === 'demo' ? '#334155' : 'transparent',
            color: viewMode === 'demo' ? '#f1f5f9' : '#94a3b8',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <BarChart2 size={14} />
          Demo Data
        </button>
        <button
          onClick={() => handleTabClick('user')}
          className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all"
          style={{
            backgroundColor: viewMode === 'user' ? '#334155' : 'transparent',
            color: viewMode === 'user' ? '#f1f5f9' : '#94a3b8',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <User size={14} />
          My Data
        </button>
      </div>

      {/* Right side: status / folder picker */}
      <div className="flex items-center gap-3">
        {/* Loading */}
        {loading && (
          <div className="flex items-center gap-2 text-xs" style={{ color: '#94a3b8' }}>
            <div className="w-3 h-3 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
            Reading files…
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="flex items-center gap-1 text-xs" style={{ color: '#f87171' }}>
            <AlertCircle size={12} /> {error}
          </div>
        )}

        {/* Pending folder confirm */}
        {pendingName && !loading && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs" style={{ color: '#94a3b8' }}>
              <FolderOpen size={13} color="#818cf8" />
              <code style={{ color: '#818cf8' }}>{pendingName}</code>
            </div>
            <button
              onClick={() => { setPendingHandle(null); setPendingName(null) }}
              className="text-xs px-2 py-1 rounded hover:opacity-80"
              style={{ backgroundColor: 'rgba(148,163,184,0.1)', color: '#94a3b8', border: '1px solid rgba(148,163,184,0.2)', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmLoad}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium hover:opacity-80"
              style={{ backgroundColor: '#6366f1', color: '#fff', border: 'none', cursor: 'pointer' }}
            >
              <FolderOpen size={12} /> Load Data
            </button>
          </div>
        )}

        {/* Real data loaded */}
        {hasRealData && !pendingName && !loading && (
          <div className="flex items-center gap-2">
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
              style={{ backgroundColor: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', color: '#4ade80' }}
            >
              <CheckCircle size={12} />
              {records.length} records · {from} → {to}
            </div>
            <button
              onClick={handlePickFolder}
              className="flex items-center gap-1 text-xs px-2 py-1.5 rounded hover:opacity-80"
              style={{ backgroundColor: 'rgba(148,163,184,0.1)', color: '#94a3b8', border: '1px solid rgba(148,163,184,0.2)', cursor: 'pointer' }}
            >
              <RefreshCw size={11} /> Change
            </button>
          </div>
        )}

        {/* User tab active, no data, no pending */}
        {viewMode === 'user' && !hasRealData && !pendingName && !loading && (
          <button
            onClick={handlePickFolder}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium hover:opacity-80 transition-opacity"
            style={{ backgroundColor: '#6366f1', color: '#fff', border: 'none', cursor: 'pointer' }}
          >
            <FolderOpen size={13} />
            Select .claude/projects folder
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        {...{ webkitdirectory: 'true' } as any}
        multiple
        style={{ display: 'none' }}
        onChange={handleFileInput}
      />
    </div>
  )
}

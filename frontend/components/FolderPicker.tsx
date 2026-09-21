'use client'

import { useRef, useState } from 'react'
import { FolderOpen, CheckCircle, AlertCircle, RefreshCw, X } from 'lucide-react'
import { useDataContext } from '@/lib/DataContext'

export default function FolderPicker() {
  const { dataSource, records, loading, error, loadFolder, loadFiles } = useDataContext()
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
    setPendingHandle(null)
    setPendingName(null)
    await loadFolder(pendingHandle)
  }

  function handleCancel() {
    setPendingHandle(null)
    setPendingName(null)
  }

  async function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      await loadFiles(e.target.files)
    }
  }

  // Successfully loaded — show green status bar
  if (dataSource === 'folder' && !loading) {
    const dates = records.map(r => r.date).sort()
    const from = dates[0] ?? '—'
    const to = dates[dates.length - 1] ?? '—'
    return (
      <div
        className="flex items-center justify-between gap-3 px-4 py-2 rounded-lg text-xs font-medium mb-4"
        style={{ backgroundColor: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', color: '#4ade80' }}
      >
        <div className="flex items-center gap-2">
          <CheckCircle size={14} />
          <span>
            Live data — {records.length} records · {from} to {to}
          </span>
        </div>
        <button
          onClick={handlePickFolder}
          className="flex items-center gap-1 px-2 py-1 rounded text-xs hover:opacity-80 transition-opacity"
          style={{ backgroundColor: 'rgba(74,222,128,0.15)', color: '#4ade80', border: 'none', cursor: 'pointer' }}
        >
          <RefreshCw size={11} /> Change folder
        </button>
      </div>
    )
  }

  // Loading state
  if (loading) {
    return (
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-lg text-xs mb-4"
        style={{ backgroundColor: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.3)', color: '#94a3b8' }}
      >
        <div className="w-3 h-3 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
        Reading your Claude data files…
      </div>
    )
  }

  // Folder selected, waiting for confirm
  if (pendingName) {
    return (
      <div
        className="rounded-xl p-4 mb-4 border"
        style={{ backgroundColor: 'rgba(99,102,241,0.08)', borderColor: 'rgba(99,102,241,0.3)' }}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <FolderOpen size={16} color="#818cf8" />
            <div className="min-w-0">
              <div className="text-xs font-medium truncate" style={{ color: '#f1f5f9' }}>
                Selected: <code style={{ color: '#818cf8' }}>{pendingName}</code>
              </div>
              <div className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>
                Click &ldquo;Load Data&rdquo; to parse your token usage
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCancel}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs hover:opacity-80 transition-opacity"
              style={{ backgroundColor: 'rgba(148,163,184,0.1)', color: '#94a3b8', border: '1px solid rgba(148,163,184,0.2)', cursor: 'pointer' }}
            >
              <X size={12} /> Cancel
            </button>
            <button
              onClick={handleConfirmLoad}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-80 transition-opacity"
              style={{ backgroundColor: '#6366f1', color: '#fff', border: 'none', cursor: 'pointer' }}
            >
              <FolderOpen size={12} /> Load Data
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Default — demo mode banner
  return (
    <div
      className="rounded-xl p-4 mb-4 border"
      style={{ backgroundColor: 'rgba(99,102,241,0.08)', borderColor: 'rgba(99,102,241,0.3)' }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: 'rgba(148,163,184,0.15)', color: '#94a3b8' }}
            >
              Demo data
            </span>
            {error && (
              <span className="flex items-center gap-1 text-xs" style={{ color: '#f87171' }}>
                <AlertCircle size={12} /> {error}
              </span>
            )}
          </div>
          <p className="text-xs" style={{ color: '#94a3b8' }}>
            Load your Claude Code data to see real token usage.{' '}
            <span style={{ color: '#cbd5e1' }}>
              Select your <code style={{ color: '#818cf8' }}>.claude\projects</code> folder.
            </span>
          </p>
          <p className="text-xs mt-1" style={{ color: '#475569' }}>
            Windows: <code>C:\Users\&lt;name&gt;\.claude\projects</code> &nbsp;·&nbsp;
            Mac/Linux: <code>~/.claude/projects</code>
            &nbsp;— show hidden folders first if needed.
          </p>
        </div>
        <button
          onClick={handlePickFolder}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium shrink-0 hover:opacity-80 transition-opacity"
          style={{ backgroundColor: '#6366f1', color: '#fff', border: 'none', cursor: 'pointer' }}
        >
          <FolderOpen size={14} />
          Load my data
        </button>
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

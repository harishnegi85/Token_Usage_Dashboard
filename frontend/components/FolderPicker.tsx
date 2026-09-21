'use client'

import { useRef } from 'react'
import { FolderOpen, CheckCircle, AlertCircle } from 'lucide-react'
import { useDataContext } from '@/lib/DataContext'

export default function FolderPicker() {
  const { dataSource, records, loading, error, loadFolder, loadFiles } = useDataContext()
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handlePickFolder() {
    const win = window as Window & { showDirectoryPicker?: (opts?: { mode?: string }) => Promise<FileSystemDirectoryHandle> }
    if (typeof win.showDirectoryPicker === 'function') {
      try {
        const dirHandle = await win.showDirectoryPicker({ mode: 'read' })
        await loadFolder(dirHandle)
      } catch {
        // user cancelled — do nothing
      }
    } else {
      fileInputRef.current?.click()
    }
  }

  async function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      await loadFiles(e.target.files)
    }
  }

  if (dataSource === 'folder' && !loading) {
    const dates = records.map(r => r.date).sort()
    const from = dates[0] ?? '—'
    const to = dates[dates.length - 1] ?? '—'
    return (
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium mb-4"
        style={{ backgroundColor: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', color: '#4ade80' }}
      >
        <CheckCircle size={14} />
        <span>Live data — {records.length} records · {from} to {to}</span>
      </div>
    )
  }

  return (
    <div
      className="rounded-xl p-4 mb-4 border"
      style={{ backgroundColor: 'rgba(99,102,241,0.08)', borderColor: 'rgba(99,102,241,0.3)' }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: 'rgba(148,163,184,0.15)', color: '#94a3b8' }}
            >
              Demo data
            </span>
            {loading && <span className="text-xs" style={{ color: '#94a3b8' }}>Reading files…</span>}
            {error && (
              <span className="flex items-center gap-1 text-xs" style={{ color: '#f87171' }}>
                <AlertCircle size={12} /> {error}
              </span>
            )}
          </div>
          <p className="text-xs" style={{ color: '#94a3b8' }}>
            Load your Claude Code data to see real token usage.{' '}
            <span style={{ color: '#cbd5e1' }}>
              Select your <code style={{ color: '#818cf8' }}>.claude/projects</code> folder.
            </span>
          </p>
          <p className="text-xs mt-1" style={{ color: '#475569' }}>
            Windows: <code>C:\Users\&lt;name&gt;\.claude\projects</code> · Mac/Linux: <code>~/.claude/projects</code>
            {' '}— you may need to show hidden folders first (Ctrl+H on Linux/Mac, View → Hidden items on Windows).
          </p>
        </div>
        <button
          onClick={handlePickFolder}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium shrink-0 transition-opacity hover:opacity-80"
          style={{
            backgroundColor: '#6366f1',
            color: '#fff',
            opacity: loading ? 0.6 : 1,
            cursor: loading ? 'not-allowed' : 'pointer',
            border: 'none',
          }}
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

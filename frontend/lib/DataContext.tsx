'use client'

import { createContext, useContext, useState, useCallback, ReactNode, useMemo } from 'react'
import {
  UsageRecord, OverviewData, UserSummary, ModelData, Recommendation, CostBreakdown, TrendsData,
  parseClaudeFolder, parseClaudeFiles,
  computeOverview, computeUsers, computeModelMix, computeRecommendations, computeCostBreakdown, computeTrends,
} from './parseClaudeData'
import {
  getMockOverview, getMockUsers, getMockModelMix, getMockRecommendations, getMockCostBreakdown, getMockTrends,
} from './mockData'

export type ViewMode = 'demo' | 'user'
export type Period = 7 | 30 | 90 | null   // null = all time

interface DataContextValue {
  records: UsageRecord[]
  dataSource: 'folder' | 'mock'
  folderName: string | null
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void
  period: Period
  setPeriod: (p: Period) => void
  loading: boolean
  error: string | null
  overview: OverviewData
  users: UserSummary[]
  modelMix: ModelData[]
  recommendations: Recommendation[]
  costBreakdown: CostBreakdown
  trends: TrendsData
  loadFolder: (dirHandle: FileSystemDirectoryHandle) => Promise<void>
  loadFiles: (files: FileList) => Promise<void>
}

const DataContext = createContext<DataContextValue | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const [records, setRecords] = useState<UsageRecord[]>([])
  const [dataSource, setDataSource] = useState<'folder' | 'mock'>('mock')
  const [folderName, setFolderName] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('demo')
  const [period, setPeriod] = useState<Period>(30)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const processRecords = useCallback((recs: UsageRecord[], name: string) => {
    setRecords(recs)
    setFolderName(name)
    setDataSource('folder')
    setViewMode('user')
  }, [])

  const loadFolder = useCallback(async (dirHandle: FileSystemDirectoryHandle) => {
    setLoading(true)
    setError(null)
    try {
      const recs = await parseClaudeFolder(dirHandle)
      processRecords(recs, dirHandle.name)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to read folder')
    } finally {
      setLoading(false)
    }
  }, [processRecords])

  const loadFiles = useCallback(async (files: FileList) => {
    setLoading(true)
    setError(null)
    try {
      const recs = await parseClaudeFiles(files)
      processRecords(recs, 'uploaded files')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to read files')
    } finally {
      setLoading(false)
    }
  }, [processRecords])

  // Use mock data when in demo mode OR when user mode but no folder loaded yet
  const useMock = viewMode === 'demo' || dataSource === 'mock'

  const days = period ?? 36500
  const users = useMemo(
    () => useMock ? getMockUsers() : computeUsers(records, days),
    [useMock, records, days]
  )

  const value: DataContextValue = {
    records,
    dataSource,
    folderName,
    viewMode,
    setViewMode,
    period,
    setPeriod,
    loading,
    error,
    overview: useMock ? getMockOverview() : computeOverview(records, days),
    users,
    modelMix: useMock ? getMockModelMix() : computeModelMix(records, days),
    recommendations: useMock ? getMockRecommendations() : computeRecommendations(users),
    costBreakdown: useMock ? getMockCostBreakdown() : computeCostBreakdown(records, days),
    trends: useMock ? getMockTrends() : computeTrends(records),
    loadFolder,
    loadFiles,
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useDataContext(): DataContextValue {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useDataContext must be used within DataProvider')
  return ctx
}

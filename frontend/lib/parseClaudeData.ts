export interface UsageRecord {
  date: string
  model: string
  input_tokens: number
  output_tokens: number
  cache_read_tokens: number
  cache_write_tokens: number
  request_count: number
  cost_usd: number
}

export interface TimeSeriesPoint {
  date: string
  haiku_tokens: number
  sonnet_tokens: number
  opus_tokens: number
  total_cost: number
}

export interface OverviewData {
  kpis: {
    total_tokens: number
    total_cost_usd: number
    active_users: number
    cache_hit_rate: number
    avg_tokens_per_request: number
    period_vs_previous: {
      total_tokens_delta_pct: number
      total_cost_delta_pct: number
    }
  }
  time_series: TimeSeriesPoint[]
}

export interface UserSummary {
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

export interface ModelData {
  model: string
  tokens: number
  cost: number
  pct_tokens: number
  pct_cost: number
}

export interface Recommendation {
  user_id: string
  type: 'enable_caching' | 'right_size_model' | 'shorten_prompts'
  severity: 'high' | 'medium' | 'low'
  title: string
  description: string
  estimated_monthly_saving_usd: number
}

export interface TokenTypeCost {
  type: string
  cost_usd: number
  tokens: number
}

export interface ActivityCost {
  activity: string
  cost_usd: number
  tokens: number
}

export interface CostBreakdown {
  by_token_type: TokenTypeCost[]
  by_activity: ActivityCost[]
}

const PRICING: Record<string, { input: number; output: number; cache_read: number; cache_write: number }> = {
  'claude-haiku-4-5':  { input: 1,   output: 5,   cache_read: 0.1,  cache_write: 1.25 },
  'claude-sonnet-4-6': { input: 3,   output: 15,  cache_read: 0.3,  cache_write: 3.75 },
  'claude-opus-4-8':   { input: 5,   output: 25,  cache_read: 0.5,  cache_write: 6.25 },
}

function normalizeModel(raw: string): string | null {
  if (!raw || raw === '<synthetic>') return null
  const lower = raw.toLowerCase()
  if (lower.includes('haiku')) return 'claude-haiku-4-5'
  if (lower.includes('sonnet')) return 'claude-sonnet-4-6'
  if (lower.includes('opus')) return 'claude-opus-4-8'
  return null
}

function computeCost(model: string, input: number, output: number, cacheRead: number, cacheWrite: number): number {
  const p = PRICING[model]
  if (!p) return 0
  return (
    input * p.input / 1_000_000 +
    output * p.output / 1_000_000 +
    cacheRead * p.cache_read / 1_000_000 +
    cacheWrite * p.cache_write / 1_000_000
  )
}

interface RawEntry {
  key: string
  date: string
  model: string
  input: number
  output: number
  cacheRead: number
  cacheWrite: number
}

async function parseJsonlText(text: string): Promise<RawEntry[]> {
  const results: RawEntry[] = []
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    try {
      const entry = JSON.parse(trimmed)
      if (entry.type !== 'assistant') continue
      const msg = entry.message || {}
      const rawModel = msg.model || ''
      const model = normalizeModel(rawModel)
      if (!model) continue
      const usage = msg.usage || {}
      const input = usage.input_tokens || 0
      const output = usage.output_tokens || 0
      const cacheWrite = usage.cache_creation_input_tokens || 0
      const cacheRead = usage.cache_read_input_tokens || 0
      if (input === 0 && output === 0) continue
      const reqId = entry.requestId || ''
      const ts: string = entry.timestamp || ''
      if (!ts) continue
      const date = ts.slice(0, 10)
      const key = reqId ? `${reqId}:${model}` : `${date}:${model}:${Math.random()}`
      results.push({ key, date, model, input, output, cacheRead, cacheWrite })
    } catch {
      // skip invalid JSON lines
    }
  }
  return results
}

function aggregateEntries(entries: RawEntry[]): UsageRecord[] {
  const seen = new Set<string>()
  const daily: Record<string, { input: number; output: number; cacheRead: number; cacheWrite: number; requests: number }> = {}

  for (const e of entries) {
    if (seen.has(e.key)) continue
    seen.add(e.key)
    const dayKey = `${e.date}:::${e.model}`
    if (!daily[dayKey]) daily[dayKey] = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, requests: 0 }
    daily[dayKey].input += e.input
    daily[dayKey].output += e.output
    daily[dayKey].cacheRead += e.cacheRead
    daily[dayKey].cacheWrite += e.cacheWrite
    daily[dayKey].requests += 1
  }

  return Object.entries(daily).map(([key, agg]) => {
    const sepIdx = key.indexOf(':::')
    const date = key.slice(0, sepIdx)
    const model = key.slice(sepIdx + 3)
    return {
      date,
      model,
      input_tokens: agg.input,
      output_tokens: agg.output,
      cache_read_tokens: agg.cacheRead,
      cache_write_tokens: agg.cacheWrite,
      request_count: agg.requests,
      cost_usd: computeCost(model, agg.input, agg.output, agg.cacheRead, agg.cacheWrite),
    }
  })
}

export async function parseClaudeFolder(dirHandle: FileSystemDirectoryHandle): Promise<UsageRecord[]> {
  const allEntries: RawEntry[] = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for await (const [, projectHandle] of (dirHandle as any).entries()) {
    if (projectHandle.kind !== 'directory') continue
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for await (const [fileName, fileHandle] of (projectHandle as any).entries()) {
      if (fileHandle.kind !== 'file') continue
      if (!fileName.endsWith('.jsonl')) continue
      if (fileName.startsWith('agent-')) continue
      try {
        const file = await fileHandle.getFile()
        const text = await file.text()
        const entries = await parseJsonlText(text)
        allEntries.push(...entries)
      } catch {
        // skip unreadable files
      }
    }
  }
  return aggregateEntries(allEntries)
}

export async function parseClaudeFiles(files: FileList): Promise<UsageRecord[]> {
  const allEntries: RawEntry[] = []
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    if (!file.name.endsWith('.jsonl')) continue
    if (file.name.startsWith('agent-')) continue
    try {
      const text = await file.text()
      const entries = await parseJsonlText(text)
      allEntries.push(...entries)
    } catch {
      // skip
    }
  }
  return aggregateEntries(allEntries)
}

function filterByPeriod(records: UsageRecord[], days: number): UsageRecord[] {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days + 1)
  const cutoffStr = cutoff.toISOString().slice(0, 10)
  return records.filter(r => r.date >= cutoffStr)
}

function filterPreviousPeriod(records: UsageRecord[], days: number): UsageRecord[] {
  const now = new Date()
  const currentStart = new Date(now)
  currentStart.setDate(currentStart.getDate() - days + 1)
  const prevEnd = new Date(currentStart)
  prevEnd.setDate(prevEnd.getDate() - 1)
  const prevStart = new Date(prevEnd)
  prevStart.setDate(prevStart.getDate() - days + 1)
  const from = prevStart.toISOString().slice(0, 10)
  const to = prevEnd.toISOString().slice(0, 10)
  return records.filter(r => r.date >= from && r.date <= to)
}

function deltaPct(curr: number, prev: number): number {
  if (prev === 0) return 0
  return Math.round((curr - prev) / prev * 1000) / 10
}

export function computeOverview(records: UsageRecord[], days = 30): OverviewData {
  const curr = filterByPeriod(records, days)
  const prev = filterPreviousPeriod(records, days)

  const totalInput = curr.reduce((s, r) => s + r.input_tokens, 0)
  const totalOutput = curr.reduce((s, r) => s + r.output_tokens, 0)
  const totalCacheRead = curr.reduce((s, r) => s + r.cache_read_tokens, 0)
  const totalCacheWrite = curr.reduce((s, r) => s + r.cache_write_tokens, 0)
  const totalTokens = totalInput + totalOutput + totalCacheRead + totalCacheWrite
  const totalCost = curr.reduce((s, r) => s + r.cost_usd, 0)
  const totalRequests = curr.reduce((s, r) => s + r.request_count, 0)
  const denom = totalInput + totalCacheRead
  const cacheHitRate = denom > 0 ? totalCacheRead / denom : 0
  const avgTokensPerRequest = totalRequests > 0 ? (totalInput + totalOutput) / totalRequests : 0

  const prevTokens = prev.reduce((s, r) => s + r.input_tokens + r.output_tokens + r.cache_read_tokens + r.cache_write_tokens, 0)
  const prevCost = prev.reduce((s, r) => s + r.cost_usd, 0)

  const daily: Record<string, { haiku: number; sonnet: number; opus: number; cost: number }> = {}
  for (const r of curr) {
    if (!daily[r.date]) daily[r.date] = { haiku: 0, sonnet: 0, opus: 0, cost: 0 }
    const tokens = r.input_tokens + r.output_tokens + r.cache_read_tokens + r.cache_write_tokens
    if (r.model === 'claude-haiku-4-5') daily[r.date].haiku += tokens
    else if (r.model === 'claude-sonnet-4-6') daily[r.date].sonnet += tokens
    else if (r.model === 'claude-opus-4-8') daily[r.date].opus += tokens
    daily[r.date].cost += r.cost_usd
  }

  const time_series: TimeSeriesPoint[] = Object.entries(daily)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, d]) => ({
      date,
      haiku_tokens: d.haiku,
      sonnet_tokens: d.sonnet,
      opus_tokens: d.opus,
      total_cost: Math.round(d.cost * 10000) / 10000,
    }))

  return {
    kpis: {
      total_tokens: totalTokens,
      total_cost_usd: Math.round(totalCost * 100) / 100,
      active_users: curr.length > 0 ? 1 : 0,
      cache_hit_rate: Math.round(cacheHitRate * 10000) / 10000,
      avg_tokens_per_request: Math.round(avgTokensPerRequest * 10) / 10,
      period_vs_previous: {
        total_tokens_delta_pct: deltaPct(totalTokens, prevTokens),
        total_cost_delta_pct: deltaPct(totalCost, prevCost),
      },
    },
    time_series,
  }
}

export function computeUsers(records: UsageRecord[], days = 30): UserSummary[] {
  const curr = filterByPeriod(records, days)
  if (curr.length === 0) return []

  const totalInput = curr.reduce((s, r) => s + r.input_tokens, 0)
  const totalOutput = curr.reduce((s, r) => s + r.output_tokens, 0)
  const totalCacheRead = curr.reduce((s, r) => s + r.cache_read_tokens, 0)
  const totalCacheWrite = curr.reduce((s, r) => s + r.cache_write_tokens, 0)
  const totalTokens = totalInput + totalOutput + totalCacheRead + totalCacheWrite
  const cost = curr.reduce((s, r) => s + r.cost_usd, 0)
  const requests = curr.reduce((s, r) => s + r.request_count, 0)
  const denom = totalInput + totalCacheRead
  const cacheHitRate = denom > 0 ? totalCacheRead / denom : 0

  const modelTokens: Record<string, number> = {}
  for (const r of curr) {
    modelTokens[r.model] = (modelTokens[r.model] || 0) + r.input_tokens + r.output_tokens
  }
  const primaryModel = Object.entries(modelTokens).sort(([, a], [, b]) => b - a)[0]?.[0] || 'claude-haiku-4-5'

  const avgInput = requests > 0 ? totalInput / requests : 0
  const avgOutput = requests > 0 ? totalOutput / requests : 0
  const flags: string[] = []
  if (cacheHitRate < 0.15 && avgInput > 2000) flags.push('low_cache_rate')
  if ((primaryModel === 'claude-opus-4-8' || primaryModel === 'claude-sonnet-4-6') && avgOutput < 300 && requests > 10) flags.push('expensive_model')
  if (avgInput > 6000) flags.push('long_prompts')

  return [{
    user_id: 'you',
    total_tokens: totalTokens,
    input_tokens: totalInput,
    output_tokens: totalOutput,
    cost_usd: Math.round(cost * 100) / 100,
    primary_model: primaryModel,
    cache_hit_rate: Math.round(cacheHitRate * 10000) / 10000,
    request_count: requests,
    optimization_flags: flags,
  }]
}

export function computeModelMix(records: UsageRecord[], days = 30): ModelData[] {
  const curr = filterByPeriod(records, days)
  const byModel: Record<string, { tokens: number; cost: number }> = {}
  for (const r of curr) {
    if (!byModel[r.model]) byModel[r.model] = { tokens: 0, cost: 0 }
    byModel[r.model].tokens += r.input_tokens + r.output_tokens + r.cache_read_tokens + r.cache_write_tokens
    byModel[r.model].cost += r.cost_usd
  }
  const totalTokens = Object.values(byModel).reduce((s, v) => s + v.tokens, 0)
  const totalCost = Object.values(byModel).reduce((s, v) => s + v.cost, 0)
  return Object.entries(byModel)
    .filter(([, v]) => v.tokens > 0)
    .map(([model, v]) => ({
      model,
      tokens: v.tokens,
      cost: Math.round(v.cost * 100) / 100,
      pct_tokens: totalTokens > 0 ? Math.round(v.tokens / totalTokens * 1000) / 10 : 0,
      pct_cost: totalCost > 0 ? Math.round(v.cost / totalCost * 1000) / 10 : 0,
    }))
}

export function computeRecommendations(users: UserSummary[]): Recommendation[] {
  const recs: Recommendation[] = []
  for (const user of users) {
    const avgInput = user.request_count > 0 ? user.input_tokens / user.request_count : 0
    const avgOutput = user.request_count > 0 ? user.output_tokens / user.request_count : 0

    if (user.cache_hit_rate < 0.1 && avgInput > 2000) {
      const saving = user.cost_usd * 0.5
      recs.push({
        user_id: user.user_id,
        type: 'enable_caching',
        severity: saving > 5 ? 'high' : saving > 1 ? 'medium' : 'low',
        title: 'Enable prompt caching',
        description: `Cache hit rate is ${(user.cache_hit_rate * 100).toFixed(1)}%. Adding cache_control to repeated context could reduce input costs by ~50%.`,
        estimated_monthly_saving_usd: Math.round(saving * 100) / 100,
      })
    }

    if ((user.primary_model === 'claude-opus-4-8' || user.primary_model === 'claude-sonnet-4-6') && avgOutput < 300 && user.request_count > 10) {
      const haikuCost = user.input_tokens * 1 / 1_000_000 + user.output_tokens * 5 / 1_000_000
      const saving = user.cost_usd - haikuCost
      if (saving > 0) {
        recs.push({
          user_id: user.user_id,
          type: 'right_size_model',
          severity: saving > 5 ? 'high' : saving > 1 ? 'medium' : 'low',
          title: 'Right-size to Claude Haiku',
          description: `Average output is ${Math.round(avgOutput)} tokens. Short responses on an expensive model — Haiku handles these at 10–20× lower cost.`,
          estimated_monthly_saving_usd: Math.round(saving * 100) / 100,
        })
      }
    }

    if (avgInput > 6000) {
      const saving = user.cost_usd * 0.3
      recs.push({
        user_id: user.user_id,
        type: 'shorten_prompts',
        severity: saving > 5 ? 'high' : saving > 1 ? 'medium' : 'low',
        title: 'Shorten system prompts',
        description: `Average input is ${Math.round(avgInput).toLocaleString()} tokens. Trimming prompts or enabling caching could reduce input costs by 30–50%.`,
        estimated_monthly_saving_usd: Math.round(saving * 100) / 100,
      })
    }
  }
  return recs
}

export function computeCostBreakdown(records: UsageRecord[], days = 30): CostBreakdown {
  const curr = filterByPeriod(records, days)
  let inputCost = 0, outputCost = 0, cacheReadCost = 0, cacheWriteCost = 0
  let inputTokens = 0, outputTokens = 0, cacheReadTokens = 0, cacheWriteTokens = 0

  for (const r of curr) {
    const p = PRICING[r.model]
    if (!p) continue
    inputCost += r.input_tokens * p.input / 1_000_000
    outputCost += r.output_tokens * p.output / 1_000_000
    cacheReadCost += r.cache_read_tokens * p.cache_read / 1_000_000
    cacheWriteCost += r.cache_write_tokens * p.cache_write / 1_000_000
    inputTokens += r.input_tokens
    outputTokens += r.output_tokens
    cacheReadTokens += r.cache_read_tokens
    cacheWriteTokens += r.cache_write_tokens
  }

  const totalCost = Math.round((inputCost + outputCost + cacheReadCost + cacheWriteCost) * 10000) / 10000
  const totalTokens2 = inputTokens + outputTokens + cacheReadTokens + cacheWriteTokens
  return {
    by_token_type: [
      { type: 'Input',       cost_usd: Math.round(inputCost * 10000) / 10000,      tokens: inputTokens },
      { type: 'Output',      cost_usd: Math.round(outputCost * 10000) / 10000,     tokens: outputTokens },
      { type: 'Cache Read',  cost_usd: Math.round(cacheReadCost * 10000) / 10000,  tokens: cacheReadTokens },
      { type: 'Cache Write', cost_usd: Math.round(cacheWriteCost * 10000) / 10000, tokens: cacheWriteTokens },
    ].filter(t => t.tokens > 0),
    by_activity: [
      { activity: 'Development', cost_usd: totalCost, tokens: totalTokens2 },
    ],
  }
}

import type { OverviewData, UserSummary, ModelData, Recommendation, CostBreakdown, TrendsData } from './parseClaudeData'

function mockDates(days = 30): string[] {
  const dates: string[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    dates.push(d.toISOString().slice(0, 10))
  }
  return dates
}

// Seeded pseudo-random to keep data consistent across renders
function seededRand(seed: number): number {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

export function getMockOverview(): OverviewData {
  const dates = mockDates()
  const timeSeries = dates.map((date, i) => ({
    date,
    haiku_tokens:  Math.round(12000 + seededRand(i * 3 + 1) * 22000),
    sonnet_tokens: Math.round(6000  + seededRand(i * 3 + 2) * 14000),
    opus_tokens:   Math.round(1500  + seededRand(i * 3 + 3) * 5000),
    total_cost:    Math.round((0.04 + seededRand(i + 99) * 0.18) * 10000) / 10000,
  }))

  const totalHaiku  = timeSeries.reduce((s, d) => s + d.haiku_tokens, 0)
  const totalSonnet = timeSeries.reduce((s, d) => s + d.sonnet_tokens, 0)
  const totalOpus   = timeSeries.reduce((s, d) => s + d.opus_tokens, 0)
  const totalTokens = totalHaiku + totalSonnet + totalOpus
  const totalCost   = timeSeries.reduce((s, d) => s + d.total_cost, 0)

  return {
    kpis: {
      total_tokens: totalTokens,
      total_cost_usd: Math.round(totalCost * 100) / 100,
      active_users: 1,
      cache_hit_rate: 0.32,
      avg_tokens_per_request: 2840,
      period_vs_previous: {
        total_tokens_delta_pct: 12.5,
        total_cost_delta_pct: 8.3,
      },
    },
    time_series: timeSeries,
  }
}

export function getMockUsers(): UserSummary[] {
  return [{
    user_id: 'you',
    total_tokens: 750000,
    input_tokens: 480000,
    output_tokens: 195000,
    cost_usd: 2.87,
    primary_model: 'claude-haiku-4-5',
    cache_hit_rate: 0.32,
    request_count: 264,
    optimization_flags: ['low_cache_rate'],
  }]
}

export function getMockModelMix(): ModelData[] {
  return [
    { model: 'claude-haiku-4-5',  tokens: 450000, cost: 0.68, pct_tokens: 60.0, pct_cost: 23.7 },
    { model: 'claude-sonnet-4-6', tokens: 240000, cost: 1.44, pct_tokens: 32.0, pct_cost: 50.2 },
    { model: 'claude-opus-4-8',   tokens:  60000, cost: 0.75, pct_tokens:  8.0, pct_cost: 26.1 },
  ]
}

export function getMockRecommendations(): Recommendation[] {
  return [
    {
      user_id: 'you',
      type: 'enable_caching',
      severity: 'high',
      title: 'Enable prompt caching',
      description: 'Cache hit rate is 32%. Adding cache_control to repeated system prompts could reduce input costs by up to 50%.',
      estimated_monthly_saving_usd: 1.20,
    },
    {
      user_id: 'you',
      type: 'right_size_model',
      severity: 'medium',
      title: 'Consider Haiku for simple tasks',
      description: 'Some Sonnet/Opus requests have short outputs (<200 tokens). These tasks may work equally well on Haiku at 10–20× lower cost.',
      estimated_monthly_saving_usd: 0.65,
    },
  ]
}

export function getMockCostBreakdown(): CostBreakdown {
  return {
    by_token_type: [
      { type: 'Input',       cost_usd: 1.42, tokens: 480000 },
      { type: 'Output',      cost_usd: 1.18, tokens: 195000 },
      { type: 'Cache Read',  cost_usd: 0.11, tokens: 75000  },
      { type: 'Cache Write', cost_usd: 0.16, tokens: 45000  },
    ],
    by_activity: [
      { activity: 'Development', cost_usd: 2.87, tokens: 795000 },
    ],
  }
}

export function getMockTrends(): TrendsData {
  const weeklyBase  = [420000, 510000, 380000, 595000, 630000, 480000, 720000, 690000]
  const monthlyCost = [1.80, 2.10, 1.65, 2.40, 2.95, 3.20]
  const monthNames  = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep']

  const weekly = weeklyBase.map((tokens, i) => ({
    label: `W${i + 1}`,
    startDate: '',
    tokens,
    cost: Math.round(tokens * 0.0000038 * 100) / 100,
    haiku_tokens:  Math.round(tokens * 0.60),
    sonnet_tokens: Math.round(tokens * 0.32),
    opus_tokens:   Math.round(tokens * 0.08),
  }))

  const monthly = monthNames.map((label, i) => {
    const tokens = Math.round(monthlyCost[i] / 0.0000038)
    return {
      label,
      startDate: '',
      tokens,
      cost: monthlyCost[i],
      haiku_tokens:  Math.round(tokens * 0.60),
      sonnet_tokens: Math.round(tokens * 0.32),
      opus_tokens:   Math.round(tokens * 0.08),
    }
  })

  const curr = weekly[7]; const prev = weekly[6]
  const currM = monthly[5]; const prevM = monthly[4]

  function dp(a: number, b: number) { return b === 0 ? 0 : Math.round((a - b) / b * 1000) / 10 }

  return {
    weekly,
    monthly,
    weekGrowth:  { tokens: dp(curr.tokens, prev.tokens),   cost: dp(curr.cost, prev.cost) },
    monthGrowth: { tokens: dp(currM.tokens, prevM.tokens), cost: dp(currM.cost, prevM.cost) },
  }
}

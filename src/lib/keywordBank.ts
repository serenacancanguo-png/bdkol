// Competitor-wide keyword bank (WEEX, BITUNIX, BLOFIN, LBANK)
// Partnership instead of affiliate
// North America / US focused, but can be adjusted.

export type KeywordBank = {
  competitors: string[]
  core: {
    assets: string[]
    derivatives: string[]
    leverageMargin: string[]
    behavior: string[]
    mechanisms: string[]
    rebatePartnership: string[]
    promotionCodes: string[]
    feesComparison: string[]
    contentTypes: string[]
    signalsPrivate: string[]
    strategyTerms: string[]
    geoNA: string[]
    intentBusiness: string[]
  }
  negatives: string[]
  readyQueries: string[]
}

export const keywordBank: KeywordBank = {
  competitors: ['weex', 'bitunix', 'blofin', 'lbank'],

  core: {
    // L2: 主流资产（组合写法优先）
    assets: ['btc', 'eth', 'xrp', 'bitcoin', 'ethereum'],

    // L2: 合约品类
    derivatives: [
      'futures trading',
      'crypto futures',
      'perpetual trading',
      'perpetual futures',
      'perps',
    ],

    // L2: 杠杆/保证金
    leverageMargin: [
      'leverage trading',
      'margin trading',
      'cross margin',
      'isolated margin',
    ],

    // L2: 合约交易行为（高频=返佣更值）
    behavior: [
      'scalping',
      'day trading',
      'intraday',
      'high frequency',
      'volume trading',
    ],

    // L2: 合约关键机制（筛"真交易者"）
    mechanisms: [
      'funding rate',
      'open interest',
      'liquidation',
      'mark price',
      'order book',
    ],

    // L2: 返佣/返现/折扣（核心直接命中）
    rebatePartnership: [
      'futures rebate',
      'fee rebate',
      'trading fee rebate',
      'fee discount',
      'trading fee discount',
      'cashback',
      'kickback',
    ],

    // L2: 联盟/推广（找愿意合作的人）
    promotionCodes: [
      'partnership',
      'partnership program',
      'referral',
      'referral program',
      'referral link',
      'invite code',
      'promo code',
      'discount code',
    ],

    // L2: 佣金与收益（筛"带量型KOL"）
    feesComparison: [
      'commission',
      'revenue share',
      'payout',
      'earnings',
      'affiliate dashboard',
      'low fees',
      'maker fee',
      'taker fee',
      'fee comparison',
      'best futures exchange fees',
    ],

    // L2: 教学型（带新手开户）
    contentTypes: [
      'tutorial',
      'guide',
      'step by step',
      'for beginners',
      'full course',
      'explained',
    ],

    // L2: 测评/对比型（强商业意图）
    signalsPrivate: [
      'exchange review',
      'best futures exchange',
      'top exchanges',
      'pros and cons',
      'fees review',
      'rebate review',
    ],

    // L2: 信号/私域型（返佣产出最高）
    strategyTerms: [
      'futures signals',
      'signals vip',
      'trade alerts',
      'entry signals',
      'copy trade',
      'copy trading',
    ],

    // L2: 交易策略型（能带交易量）
    geoNA: [
      'strategy',
      'setup',
      'entry',
      'take profit',
      'tp',
      'stop loss',
      'sl',
      'risk management',
      'trading journal',
      'live trading',
    ],

    // L2: 业务意图（保留旧的）
    intentBusiness: [
      'partnership',
      'referral',
      'referral link',
      'fee rebate',
      'fee discount',
      'commission',
      'revenue share',
    ],
  },

  negatives: [
    'guaranteed profit',
    'sure win',
    '100% win',
    'no loss',
    'get rich quick',
    'pump group',
    'free money',
    'doubling',
    'giveaway',
    'airdrop claim',
    'wallet connect',
    'seed phrase',
    'private key',
  ],

  // Ready queries: generated once and stored for quick copy-paste into tools
  readyQueries: [], // will be filled by buildReadyQueries()
}

// --------- Generator (build 200~500 queries cleanly) ---------

export function buildQueries(opts?: {
  competitors?: string[]
  geo?: string[]
  maxPerCompetitor?: number
  includeNegatives?: boolean
  maxNegatives?: number
}): string[] {
  const competitors = (opts?.competitors ?? keywordBank.competitors).map(s =>
    s.toLowerCase()
  )
  const geo = opts?.geo ?? keywordBank.core.geoNA
  const maxPerCompetitor = opts?.maxPerCompetitor ?? 120
  const includeNegatives = opts?.includeNegatives ?? false
  const maxNegatives = opts?.maxNegatives ?? 8

  const c = keywordBank.core

  const perCompetitor = competitors.flatMap(comp => {
    const buckets: string[][] = [
      // A) competitor + business intent (most direct)
      c.intentBusiness.map(t => `${comp} ${t}`),

      // B) competitor + derivatives + business intent
      mix([comp], c.derivatives, c.intentBusiness),

      // C) competitor + rebate/discount + derivatives
      mix([comp], c.rebatePartnership, c.derivatives),

      // D) competitor + promo/referral + derivatives
      mix([comp], c.promotionCodes, c.derivatives),

      // E) competitor + mechanisms (filter real traders)
      mix([comp], c.mechanisms),

      // F) competitor + behavior + asset + perps/futures
      mix([comp], c.behavior, c.assets, ['perps', 'futures']),

      // G) geo + competitor + derivatives + partnership/rebate
      mix(geo, [comp], c.derivatives, [
        'partnership',
        'sponsorship',
        'fee rebate',
        'fee discount',
      ]),

      // H) review / fees intent (high commercial intent)
      mix([comp], c.contentTypes, c.feesComparison, ['futures', 'perps']),
    ]

    const flat = buckets.flat().map(cleanQuery).filter(Boolean)
    const uniq = Array.from(new Set(flat)).slice(0, maxPerCompetitor)

    return includeNegatives ? uniq.map(q => withNegatives(q, maxNegatives)) : uniq
  })

  return Array.from(new Set(perCompetitor))
}

// Build a small "best of" list (fast to copy-paste)
export function buildBest20PerCompetitor(): Record<string, string[]> {
  const c = keywordBank.core
  const geo = c.geoNA

  const best = (comp: string) =>
    [
      `${comp} futures partnership`,
      `${comp} perps partnership`,
      `${comp} sponsorship inquiry`,
      `${comp} "paid partnership"`,
      `${comp} "business inquiry"`,
      `${comp} futures "referral link"`,
      `${comp} perps "promo code"`,
      `${comp} "fee rebate" perps`,
      `${comp} "fee discount" futures`,
      `${comp} exchange review futures`,
      `${geo[0]} ${comp} futures partnership`,
      `${geo[3]} ${comp} sponsorship`,
      `${comp} funding rate open interest`,
      `${comp} liquidation heatmap`,
      `${comp} BTC perps scalping`,
      `${comp} ETH futures day trading`,
      `${comp} XRP perps strategy`,
      `${comp} maker fee taker fee`,
      `${comp} fee comparison futures`,
      `${comp} best futures exchange fees`,
    ].map(cleanQuery)

  const out: Record<string, string[]> = {}
  for (const comp of keywordBank.competitors) out[comp] = best(comp)
  return out
}

// Fill keywordBank.readyQueries with a clean set (optional)
export function buildReadyQueries(): string[] {
  const bestMap = buildBest20PerCompetitor()
  const bestAll = Object.values(bestMap).flat()
  // add some global (non-competitor) discovery queries too:
  const global = [
    'perps trader usa partnership',
    'crypto futures youtube "paid partnership"',
    'futures fee rebate usa',
    'futures exchange review "referral link"',
    'liquidation heatmap perps explained',
    'funding rate open interest explained',
    'btc perps scalping strategy',
    'eth futures market structure',
    'xrp perpetual trading setup',
  ]
  return Array.from(new Set([...bestAll, ...global])).map(cleanQuery)
}

// --------- helpers ---------

function mix(...lists: string[][]): string[] {
  return lists.reduce<string[]>(
    (acc, list) => acc.flatMap(a => list.map(b => `${a} ${b}`.trim())),
    ['']
  )
}

function cleanQuery(q: string): string {
  return q.replace(/\s+/g, ' ').trim()
}

export function withNegatives(query: string, maxNeg = 8): string {
  const neg = keywordBank.negatives
    .slice(0, maxNeg)
    .map(n => `-"${n}"`)
    .join(' ')
  return `${query} ${neg}`.trim()
}

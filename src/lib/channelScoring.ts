/**
 * 频道评分与证据提取引擎
 * 用于对候选频道进行智能 rerank
 */

export type EvidenceType = 'contract' | 'mechanism' | 'commercial' | 'competitor' | 'negative'

export type Evidence = {
  type: EvidenceType
  keyword: string
  count: number
  source: 'title' | 'description' | 'channelDescription'
}

export type ScoringResult = {
  channelId: string
  totalScore: number
  evidenceList: Evidence[]
  breakdown: {
    contractScore: number
    mechanismScore: number
    commercialScore: number
    competitorScore: number
    negativePenalty: number
  }
  meets: {
    subsThreshold: boolean
    contractWords: boolean
    commercialWords: boolean
    totalScore: boolean
  }
}

/**
 * 关键词词库（权重化）
 */
const KEYWORD_WEIGHTS = {
  // 合约核心词（高权重）
  contract: {
    futures: 3,
    perps: 3,
    perpetual: 3,
    derivatives: 2,
    'perpetual futures': 4,
    'futures trading': 3,
    leverage: 2,
    margin: 1,
    'short position': 2,
    'long position': 2,
  },
  
  // 机制专业词（中权重）
  mechanism: {
    'funding rate': 3,
    'open interest': 3,
    liquidation: 2,
    'mark price': 2,
    'order book': 2,
    'cross margin': 2,
    'isolated margin': 2,
    'take profit': 1,
    'stop loss': 1,
    'limit order': 1,
  },
  
  // 商业合作词（高权重）
  commercial: {
    partnership: 4,
    'partner program': 4,
    referral: 3,
    'referral code': 4,
    'promo code': 3,
    rebate: 3,
    'fee discount': 3,
    'sign up bonus': 2,
    cashback: 2,
    commission: 2,
    sponsored: 3,
    collaborate: 2,
  },
  
  // 负向词（扣分）
  negative: {
    loan: -3,
    mortgage: -3,
    credit: -2,
    lyrics: -4,
    song: -4,
    music: -3,
    banking: -2,
    'bank account': -3,
  }
}

/**
 * 硬门槛配置
 */
export const THRESHOLDS = {
  minSubscribers: 10000,
  minContractWords: 2,
  minCommercialWords: 1,
  minTotalScore: 12,
}

/**
 * 从文本中提取关键词证据
 */
function extractKeywords(
  text: string,
  keywords: Record<string, number>,
  type: EvidenceType,
  source: 'title' | 'description' | 'channelDescription'
): Evidence[] {
  const evidences: Evidence[] = []
  const lowerText = text.toLowerCase()
  
  for (const [keyword, weight] of Object.entries(keywords)) {
    // 使用词边界匹配，避免部分匹配
    const regex = new RegExp(`\\b${keyword.replace(/\s+/g, '\\s+')}\\b`, 'gi')
    const matches = lowerText.match(regex)
    
    if (matches && matches.length > 0) {
      evidences.push({
        type,
        keyword,
        count: matches.length,
        source
      })
    }
  }
  
  return evidences
}

/**
 * 计算证据得分
 */
function calculateScore(evidences: Evidence[]): number {
  let score = 0
  
  for (const evidence of evidences) {
    const keywords = KEYWORD_WEIGHTS[evidence.type as keyof typeof KEYWORD_WEIGHTS] || {}
    const weight = keywords[evidence.keyword as keyof typeof keywords] || 0
    
    // 基础分 = 权重 × 命中次数（最多计3次，避免刷分）
    const baseScore = weight * Math.min(evidence.count, 3)
    
    // 来源加成：标题 1.5x，描述 1.0x，频道描述 0.8x
    const sourceMultiplier = evidence.source === 'title' ? 1.5 : 
                            evidence.source === 'description' ? 1.0 : 0.8
    
    score += baseScore * sourceMultiplier
  }
  
  return Math.round(score)
}

/**
 * 核心函数：对频道进行评分
 */
export function scoreChannel(input: {
  channelId: string
  channelDescription: string
  videos: Array<{ title: string; description: string }>
  subscriberCount: number
  competitorBrands: string[]
}): ScoringResult {
  const { channelId, channelDescription, videos, subscriberCount, competitorBrands } = input
  
  const allEvidences: Evidence[] = []
  
  // 1. 从频道描述中提取
  allEvidences.push(
    ...extractKeywords(channelDescription, KEYWORD_WEIGHTS.contract, 'contract', 'channelDescription'),
    ...extractKeywords(channelDescription, KEYWORD_WEIGHTS.mechanism, 'mechanism', 'channelDescription'),
    ...extractKeywords(channelDescription, KEYWORD_WEIGHTS.commercial, 'commercial', 'channelDescription'),
    ...extractKeywords(channelDescription, KEYWORD_WEIGHTS.negative, 'negative', 'channelDescription')
  )
  
  // 2. 从视频标题和描述中提取（最多处理10条视频）
  for (const video of videos.slice(0, 10)) {
    // 标题
    allEvidences.push(
      ...extractKeywords(video.title, KEYWORD_WEIGHTS.contract, 'contract', 'title'),
      ...extractKeywords(video.title, KEYWORD_WEIGHTS.mechanism, 'mechanism', 'title'),
      ...extractKeywords(video.title, KEYWORD_WEIGHTS.commercial, 'commercial', 'title'),
      ...extractKeywords(video.title, KEYWORD_WEIGHTS.negative, 'negative', 'title')
    )
    
    // 描述
    allEvidences.push(
      ...extractKeywords(video.description, KEYWORD_WEIGHTS.contract, 'contract', 'description'),
      ...extractKeywords(video.description, KEYWORD_WEIGHTS.mechanism, 'mechanism', 'description'),
      ...extractKeywords(video.description, KEYWORD_WEIGHTS.commercial, 'commercial', 'description'),
      ...extractKeywords(video.description, KEYWORD_WEIGHTS.negative, 'negative', 'description')
    )
  }
  
  // 3. 检查竞品词（从所有文本中）
  const allText = [
    channelDescription,
    ...videos.map(v => `${v.title} ${v.description}`)
  ].join(' ')
  
  for (const brand of competitorBrands) {
    const regex = new RegExp(`\\b${brand}\\b`, 'gi')
    const matches = allText.match(regex)
    if (matches && matches.length > 0) {
      allEvidences.push({
        type: 'competitor',
        keyword: brand,
        count: matches.length,
        source: 'description'
      })
    }
  }
  
  // 4. 合并同类证据（去重计数）
  const mergedEvidences = mergeDuplicateEvidences(allEvidences)
  
  // 5. 计算分项得分
  const contractEvidences = mergedEvidences.filter(e => e.type === 'contract')
  const mechanismEvidences = mergedEvidences.filter(e => e.type === 'mechanism')
  const commercialEvidences = mergedEvidences.filter(e => e.type === 'commercial')
  const competitorEvidences = mergedEvidences.filter(e => e.type === 'competitor')
  const negativeEvidences = mergedEvidences.filter(e => e.type === 'negative')
  
  const contractScore = calculateScore(contractEvidences)
  const mechanismScore = calculateScore(mechanismEvidences)
  const commercialScore = calculateScore(commercialEvidences)
  const competitorScore = calculateScore(competitorEvidences)
  const negativePenalty = calculateScore(negativeEvidences) // 负数
  
  const totalScore = contractScore + mechanismScore + commercialScore + competitorScore + negativePenalty
  
  // 6. 检查硬门槛
  const contractWordCount = contractEvidences.reduce((sum, e) => sum + e.count, 0)
  const commercialWordCount = commercialEvidences.reduce((sum, e) => sum + e.count, 0)
  
  return {
    channelId,
    totalScore,
    evidenceList: mergedEvidences,
    breakdown: {
      contractScore,
      mechanismScore,
      commercialScore,
      competitorScore,
      negativePenalty
    },
    meets: {
      subsThreshold: subscriberCount >= THRESHOLDS.minSubscribers,
      contractWords: contractWordCount >= THRESHOLDS.minContractWords,
      commercialWords: commercialWordCount >= THRESHOLDS.minCommercialWords,
      totalScore: totalScore >= THRESHOLDS.minTotalScore
    }
  }
}

/**
 * 合并重复证据（同类型 + 同关键词）
 */
function mergeDuplicateEvidences(evidences: Evidence[]): Evidence[] {
  const map = new Map<string, Evidence>()
  
  for (const evidence of evidences) {
    const key = `${evidence.type}-${evidence.keyword}`
    const existing = map.get(key)
    
    if (existing) {
      existing.count += evidence.count
    } else {
      map.set(key, { ...evidence })
    }
  }
  
  return Array.from(map.values())
}

/**
 * 批量评分并过滤
 */
export function rankChannels(
  channels: Array<{
    channelId: string
    channelDescription: string
    videos: Array<{ title: string; description: string }>
    subscriberCount: number
  }>,
  competitorBrands: string[]
): ScoringResult[] {
  // 1. 对所有频道评分
  const scored = channels.map(ch => scoreChannel({
    ...ch,
    competitorBrands
  }))
  
  // 2. 应用硬门槛过滤
  const filtered = scored.filter(s => 
    s.meets.subsThreshold &&
    s.meets.contractWords &&
    s.meets.commercialWords &&
    s.meets.totalScore
  )
  
  // 3. 按总分降序排序
  const ranked = filtered.sort((a, b) => b.totalScore - a.totalScore)
  
  // 4. 返回 Top 5
  return ranked.slice(0, 5)
}

/**
 * 格式化证据列表（用于 UI 显示）
 */
export function formatEvidences(evidences: Evidence[]): Array<{
  label: string
  type: EvidenceType
  count: number
}> {
  return evidences
    .filter(e => e.type !== 'negative') // 不显示负向词
    .sort((a, b) => {
      // 先按类型排序：commercial > contract > mechanism > competitor
      const typeOrder = { commercial: 0, contract: 1, mechanism: 2, competitor: 3 }
      const orderA = typeOrder[a.type as keyof typeof typeOrder] ?? 4
      const orderB = typeOrder[b.type as keyof typeof typeOrder] ?? 4
      if (orderA !== orderB) return orderA - orderB
      // 同类型按出现次数排序
      return b.count - a.count
    })
    .map(e => ({
      label: e.keyword,
      type: e.type,
      count: e.count
    }))
}

/**
 * 调试工具：输出评分详情
 */
export function debugScoring(result: ScoringResult): void {
  console.log('🎯 Channel Scoring Debug:')
  console.log('  Channel ID:', result.channelId)
  console.log('  Total Score:', result.totalScore)
  console.log('  Breakdown:', result.breakdown)
  console.log('  Meets Thresholds:', result.meets)
  console.log('  Evidence Count:', result.evidenceList.length)
  console.log('  Top Evidences:')
  formatEvidences(result.evidenceList).slice(0, 10).forEach(e => {
    console.log(`    - ${e.label} (${e.type}) x${e.count}`)
  })
}

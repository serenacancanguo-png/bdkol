/**
 * KOL 评分模块
 * 基于证据对 KOL 与竞品的关系进行评分
 */

import { Evidence, EvidenceType } from './evidence'
import { Competitor } from './competitors'

/**
 * 关系类型
 */
export enum RelationshipType {
  CONFIRMED_PARTNER = 'CONFIRMED_PARTNER',      // 确认合作伙伴（90-100分）
  LIKELY_PARTNER = 'LIKELY_PARTNER',            // 可能合作伙伴（70-89分）
  POTENTIAL_PARTNER = 'POTENTIAL_PARTNER',      // 潜在合作伙伴（50-69分）
  CASUAL_MENTION = 'CASUAL_MENTION',            // 偶然提及（30-49分）
  UNRELATED = 'UNRELATED',                      // 无关（0-29分）
}

/**
 * 频道统计信息（可选）
 */
export interface ChannelStats {
  subscriberCount?: number
  videoCount?: number
  viewCount?: number
  averageViews?: number
  engagementRate?: number
  country?: string
  description?: string
  customUrl?: string
}

/**
 * 内容分析数据
 */
export interface ContentAnalysis {
  contractSignals: number      // 合约强信号词计数
  monetizationSignals: number  // 变现/合作信号计数
  isNorthAmerica: boolean      // 北美信号
  isLongTail: boolean          // 长尾频道标记
}

/**
 * 评分结果
 */
export interface ScoringResult {
  confidenceScore: number        // 0-100 的置信度分数
  relationshipType: RelationshipType
  reasons: string[]               // 评分理由（可解释性）
  breakdown: {
    relevanceScore: number        // 相关性得分（40%）
    scaleScore: number            // 体量得分（35%）
    monetizationScore: number     // 变现得分（20%）
    geoScore: number              // 北美得分（5%）
    riskPenalty: number           // 风险扣分
  }
  contentAnalysis: ContentAnalysis  // 内容分析
}

/**
 * 证据类型权重（使用 partnership 术语）
 */
const EVIDENCE_WEIGHTS = {
  [EvidenceType.AFFILIATE_LINK]: 35,           // 合作链接权重最高
  [EvidenceType.PROMO_CODE]: 30,               // 推广码次之
  [EvidenceType.SPONSORED_DISCLOSURE]: 25,     // 赞助声明
  [EvidenceType.CTA_MENTION]: 10,              // 行动号召权重较低
}

/**
 * 合约强信号词（用于识别真实交易者）
 */
const CONTRACT_SIGNALS = [
  'funding rate',
  'open interest',
  'oi',
  'liquidation',
  'mark price',
  'order book',
  'long short',
  'long/short',
  'cross margin',
  'isolated margin',
]

/**
 * 变现/合作信号词
 */
const MONETIZATION_SIGNALS = [
  'partnership',
  'rebate',
  'referral code',
  'promo code',
  'fee discount',
  'sign up bonus',
  'commission',
  'revenue share',
  'cashback',
]

/**
 * 北美地域信号词
 */
const NORTH_AMERICA_SIGNALS = [
  'usa',
  'us',
  'united states',
  'america',
  'american',
  'canada',
  'canadian',
  'north america',
]

/**
 * 计算证据得分
 */
function calculateEvidenceScore(evidences: Evidence[]): {
  score: number
  reasons: string[]
} {
  let score = 0
  const reasons: string[] = []
  const evidenceByType: Record<string, number> = {}

  for (const evidence of evidences) {
    const weight = EVIDENCE_WEIGHTS[evidence.type]
    const contribution = weight * evidence.confidence

    score += contribution

    // 统计每种类型的证据数量
    evidenceByType[evidence.type] = (evidenceByType[evidence.type] || 0) + 1
  }

  // 生成理由
  if (evidenceByType[EvidenceType.AFFILIATE_LINK]) {
    reasons.push(
      `发现 ${evidenceByType[EvidenceType.AFFILIATE_LINK]} 个合作链接（强证据）`
    )
  }

  if (evidenceByType[EvidenceType.PROMO_CODE]) {
    reasons.push(
      `发现 ${evidenceByType[EvidenceType.PROMO_CODE]} 个推广码（强证据）`
    )
  }

  if (evidenceByType[EvidenceType.SPONSORED_DISCLOSURE]) {
    reasons.push(
      `发现 ${evidenceByType[EvidenceType.SPONSORED_DISCLOSURE]} 个赞助声明（强证据）`
    )
  }

  if (evidenceByType[EvidenceType.CTA_MENTION]) {
    reasons.push(
      `发现 ${evidenceByType[EvidenceType.CTA_MENTION]} 个行动号召提及`
    )
  }

  if (evidences.length === 0) {
    reasons.push('未发现明确的合作证据')
  }

  // 证据得分上限 100
  return {
    score: Math.min(100, score),
    reasons,
  }
}

/**
 * 计算频道质量得分（可选）
 */
function calculateChannelScore(stats?: ChannelStats): {
  score: number
  reasons: string[]
} {
  if (!stats) {
    return { score: 0, reasons: [] }
  }

  let score = 0
  const reasons: string[] = []

  // 订阅数加分（最多 30 分）
  if (stats.subscriberCount) {
    if (stats.subscriberCount >= 1000000) {
      score += 30
      reasons.push('大型频道（100万+ 订阅）')
    } else if (stats.subscriberCount >= 500000) {
      score += 25
      reasons.push('中大型频道（50万+ 订阅）')
    } else if (stats.subscriberCount >= 100000) {
      score += 20
      reasons.push('中型频道（10万+ 订阅）')
    } else if (stats.subscriberCount >= 50000) {
      score += 15
      reasons.push('小型频道（5万+ 订阅）')
    } else if (stats.subscriberCount >= 10000) {
      score += 10
      reasons.push('微型频道（1万+ 订阅）')
    }
  }

  // 内容产出加分（最多 10 分）
  if (stats.videoCount) {
    if (stats.videoCount >= 1000) {
      score += 10
      reasons.push('高产创作者（1000+ 视频）')
    } else if (stats.videoCount >= 500) {
      score += 8
      reasons.push('活跃创作者（500+ 视频）')
    } else if (stats.videoCount >= 100) {
      score += 5
      reasons.push('常规创作者（100+ 视频）')
    }
  }

  // 互动率加分（最多 10 分）
  if (stats.engagementRate) {
    if (stats.engagementRate >= 0.05) {
      score += 10
      reasons.push('高互动率（5%+）')
    } else if (stats.engagementRate >= 0.03) {
      score += 7
      reasons.push('良好互动率（3%+）')
    } else if (stats.engagementRate >= 0.01) {
      score += 4
      reasons.push('一般互动率（1%+）')
    }
  }

  return { score: Math.min(50, score), reasons }
}

/**
 * 计算风险扣分
 */
function calculateRiskPenalty(
  evidences: Evidence[],
  competitorConfig?: Competitor
): {
  penalty: number
  reasons: string[]
} {
  if (!competitorConfig) {
    return { penalty: 0, reasons: [] }
  }

  let penalty = 0
  const reasons: string[] = []

  // 检查证据文本中是否包含风险词
  const allText = evidences.map(e => e.snippet).join(' ').toLowerCase()

  for (const riskTerm of competitorConfig.risk_terms) {
    if (allText.includes(riskTerm.toLowerCase())) {
      penalty += 10
      reasons.push(`包含风险词汇: "${riskTerm}"`)
    }
  }

  // 风险扣分上限 30 分
  return {
    penalty: Math.min(30, penalty),
    reasons,
  }
}

/**
 * 确定关系类型
 */
function determineRelationshipType(score: number): RelationshipType {
  if (score >= 90) return RelationshipType.CONFIRMED_PARTNER
  if (score >= 70) return RelationshipType.LIKELY_PARTNER
  if (score >= 50) return RelationshipType.POTENTIAL_PARTNER
  if (score >= 30) return RelationshipType.CASUAL_MENTION
  return RelationshipType.UNRELATED
}

/**
 * 分析内容信号
 */
function analyzeContent(
  evidences: Evidence[],
  channelStats?: ChannelStats
): ContentAnalysis {
  const allText = evidences.map(e => e.snippet).join(' ').toLowerCase()
  const channelText = `${channelStats?.description || ''} ${channelStats?.customUrl || ''}`.toLowerCase()

  // 1. 合约强信号词计数
  const contractSignals = CONTRACT_SIGNALS.reduce((count, signal) => {
    return count + (allText.includes(signal.toLowerCase()) ? 1 : 0)
  }, 0)

  // 2. 变现/合作信号计数
  const monetizationSignals = MONETIZATION_SIGNALS.reduce((count, signal) => {
    return count + (allText.includes(signal.toLowerCase()) ? 1 : 0)
  }, 0)

  // 3. 北美信号检测
  const hasNAKeyword = NORTH_AMERICA_SIGNALS.some(signal =>
    channelText.includes(signal.toLowerCase())
  )
  const hasNACountry = channelStats?.country === 'US' || channelStats?.country === 'CA'
  const isNorthAmerica = hasNAKeyword || hasNACountry

  // 4. 长尾频道标记
  const subs = channelStats?.subscriberCount || 0
  const isLongTail = subs < 5000

  return {
    contractSignals,
    monetizationSignals,
    isNorthAmerica,
    isLongTail,
  }
}

/**
 * 计算相关性得分（40分满分）
 */
function calculateRelevanceScore(
  evidences: Evidence[],
  contentAnalysis: ContentAnalysis
): number {
  let score = 0

  // 证据强度（最多 25 分）
  for (const evidence of evidences) {
    const weight = EVIDENCE_WEIGHTS[evidence.type]
    score += (weight / 100) * 25 * evidence.confidence
  }

  // 合约强信号加分（最多 15 分）
  const contractBonus = Math.min(15, contentAnalysis.contractSignals * 3)
  score += contractBonus

  return Math.min(40, score)
}

/**
 * 计算体量得分（35分满分）
 */
function calculateScaleScore(
  channelStats?: ChannelStats,
  isLongTail?: boolean
): number {
  if (!channelStats) return 0

  let score = 0

  // 订阅数（最多 25 分）
  const subs = channelStats.subscriberCount || 0
  if (subs >= 1000000) score += 25
  else if (subs >= 500000) score += 22
  else if (subs >= 100000) score += 18
  else if (subs >= 50000) score += 14
  else if (subs >= 10000) score += 10
  else if (subs >= 5000) score += 5

  // 长尾频道降权
  if (isLongTail) {
    score = score * 0.5  // 长尾频道体量分减半
  }

  // 视频数（最多 10 分）
  const videos = channelStats.videoCount || 0
  if (videos >= 1000) score += 10
  else if (videos >= 500) score += 8
  else if (videos >= 100) score += 5
  else if (videos >= 50) score += 3

  return Math.min(35, score)
}

/**
 * 计算变现得分（20分满分）
 */
function calculateMonetizationScore(
  contentAnalysis: ContentAnalysis
): number {
  // 每个变现信号 2.5 分，最多 20 分
  return Math.min(20, contentAnalysis.monetizationSignals * 2.5)
}

/**
 * 计算北美得分（5分满分）
 */
function calculateGeoScore(contentAnalysis: ContentAnalysis): number {
  return contentAnalysis.isNorthAmerica ? 5 : 0
}

/**
 * 为创作者评分（新评分公式）
 * score = 相关性40 + 体量35 + 变现20 + 北美5
 */
export function scoreCreator(
  evidences: Evidence[],
  channelStats?: ChannelStats,
  competitorConfig?: Competitor
): ScoringResult {
  // 1. 内容分析
  const contentAnalysis = analyzeContent(evidences, channelStats)

  // 2. 计算各维度得分（新公式）
  const relevanceScore = calculateRelevanceScore(evidences, contentAnalysis)
  const scaleScore = calculateScaleScore(channelStats, contentAnalysis.isLongTail)
  const monetizationScore = calculateMonetizationScore(contentAnalysis)
  const geoScore = calculateGeoScore(contentAnalysis)

  // 3. 计算风险扣分
  const riskResult = calculateRiskPenalty(evidences, competitorConfig)

  // 4. 综合得分（新公式）
  const rawScore = relevanceScore + scaleScore + monetizationScore + geoScore - riskResult.penalty
  const confidenceScore = Math.max(0, Math.min(100, rawScore))

  // 5. 确定关系类型
  const relationshipType = determineRelationshipType(confidenceScore)

  // 6. 生成理由
  const allReasons: string[] = []

  // 相关性理由
  if (contentAnalysis.contractSignals > 0) {
    allReasons.push(`合约专业度：发现 ${contentAnalysis.contractSignals} 个强信号词`)
  }

  // 变现理由
  if (contentAnalysis.monetizationSignals > 0) {
    allReasons.push(`合作意向：发现 ${contentAnalysis.monetizationSignals} 个变现信号`)
  }

  // 体量理由
  if (channelStats?.subscriberCount) {
    const subs = channelStats.subscriberCount
    if (subs >= 100000) {
      allReasons.push(`大型频道：${formatSubs(subs)} 订阅`)
    } else if (subs >= 10000) {
      allReasons.push(`中型频道：${formatSubs(subs)} 订阅`)
    } else if (subs >= 5000) {
      allReasons.push(`小型频道：${formatSubs(subs)} 订阅`)
    }
  }

  // 长尾标记
  if (contentAnalysis.isLongTail) {
    allReasons.push('⚠️ 长尾频道（<5K 订阅，已降权）')
  }

  // 北美信号
  if (contentAnalysis.isNorthAmerica) {
    allReasons.push('🌎 北美市场相关')
  }

  // 风险提示
  if (riskResult.reasons.length > 0) {
    allReasons.push(...riskResult.reasons)
  }

  // 综合评价
  if (confidenceScore >= 90) {
    allReasons.push('✅ 确认的合作伙伴，建议优先联系')
  } else if (confidenceScore >= 70) {
    allReasons.push('✅ 很可能存在合作关系')
  } else if (confidenceScore >= 50) {
    allReasons.push('⚡ 存在合作潜力')
  }

  return {
    confidenceScore,
    relationshipType,
    reasons: allReasons,
    breakdown: {
      relevanceScore,
      scaleScore,
      monetizationScore,
      geoScore,
      riskPenalty: riskResult.penalty,
    },
    contentAnalysis,
  }
}

function formatSubs(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`
  return count.toString()
}

/**
 * 批量评分
 */
export function scoreCreatorBatch(
  evidencesList: Evidence[][],
  channelStatsList?: ChannelStats[],
  competitorConfig?: Competitor
): ScoringResult[] {
  return evidencesList.map((evidences, index) =>
    scoreCreator(
      evidences,
      channelStatsList?.[index],
      competitorConfig
    )
  )
}

/**
 * 获取关系类型的中文描述
 */
export function getRelationshipTypeLabel(type: RelationshipType): string {
  const labels = {
    [RelationshipType.CONFIRMED_PARTNER]: '确认合作伙伴',
    [RelationshipType.LIKELY_PARTNER]: '可能合作伙伴',
    [RelationshipType.POTENTIAL_PARTNER]: '潜在合作伙伴',
    [RelationshipType.CASUAL_MENTION]: '偶然提及',
    [RelationshipType.UNRELATED]: '无关',
  }
  return labels[type]
}

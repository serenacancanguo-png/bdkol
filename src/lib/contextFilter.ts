/**
 * 语境过滤与排序模块
 * 基于内容语境和商业合作信号进行精准过滤和评分
 */

import type { YouTubeVideo, YouTubeChannel } from './youtube'

/**
 * 命中证据（关键词列表）
 */
export interface MatchedEvidence {
  commercialKeywords: string[]      // 商业合作关键词
  contractKeywords: string[]        // 合约语境关键词
  qualityIndicators: string[]       // 质量指标（review/fees等）
  riskFlags: string[]               // 风险标记（夸张收益等）
  hasExternalLinks: boolean         // 是否有外链
  externalLinkTypes: string[]       // 外链类型
}

/**
 * 过滤结果
 */
export interface FilteredItem {
  videoId?: string
  channelId: string
  title: string
  description: string
  relevanceScore: number            // 相关性评分 (0-100)
  matchedEvidence: MatchedEvidence  // 命中证据
  passedFilter: boolean             // 是否通过过滤
  filterReason?: string             // 未通过原因
}

/**
 * 商业合作关键词
 */
const COMMERCIAL_KEYWORDS = [
  'referral',
  'partnership',
  'promo code',
  'invite code',
  'fee discount',
  'rebate',
  'commission',
  'revenue share',
  'cashback',
  'sign up bonus',
  'affiliate',
  'sponsored',
  'collaboration',
  'earn together',
]

/**
 * 合约语境关键词
 */
const CONTRACT_KEYWORDS = [
  'futures',
  'perps',
  'perpetual',
  'leverage',
  'long short',
  'long/short',
  'funding rate',
  'liquidation',
  'open interest',
  'oi',
  'mark price',
  'order book',
  'margin trading',
  'cross margin',
  'isolated margin',
  'position',
  'long position',
  'short position',
]

/**
 * 质量指标关键词
 */
const QUALITY_INDICATORS = [
  'review',
  'fees',
  'best exchange',
  'comparison',
  'vs',
  'tutorial',
  'guide',
  'how to',
  'analysis',
  'trading strategy',
]

/**
 * 风险标记关键词（夸张收益、保证）
 */
const RISK_FLAGS = [
  'guaranteed',
  '100x',
  '1000x',
  '10000x',
  'get rich',
  'easy money',
  'no risk',
  'sure profit',
  'guaranteed profit',
  'never lose',
  'can\'t lose',
  'risk free',
  'instant millionaire',
]

/**
 * 外链模式
 */
const EXTERNAL_LINK_PATTERNS = [
  { pattern: /https?:\/\//i, type: 'http_link' },
  { pattern: /bit\.ly\//i, type: 'bitly' },
  { pattern: /linktr\.ee\//i, type: 'linktree' },
  { pattern: /t\.me\//i, type: 'telegram' },
  { pattern: /discord\.gg\//i, type: 'discord' },
  { pattern: /discord\.com\//i, type: 'discord' },
  { pattern: /twitter\.com\//i, type: 'twitter' },
  { pattern: /x\.com\//i, type: 'twitter' },
]

/**
 * 检测关键词命中
 */
function detectKeywords(text: string, keywords: string[]): string[] {
  const lowerText = text.toLowerCase()
  const matched: string[] = []
  
  for (const keyword of keywords) {
    const lowerKeyword = keyword.toLowerCase()
    if (lowerText.includes(lowerKeyword)) {
      matched.push(keyword)
    }
  }
  
  return matched
}

/**
 * 检测外链
 */
function detectExternalLinks(text: string): {
  hasLinks: boolean
  linkTypes: string[]
} {
  const linkTypes: string[] = []
  
  for (const { pattern, type } of EXTERNAL_LINK_PATTERNS) {
    if (pattern.test(text)) {
      if (!linkTypes.includes(type)) {
        linkTypes.push(type)
      }
    }
  }
  
  return {
    hasLinks: linkTypes.length > 0,
    linkTypes,
  }
}

/**
 * 计算相关性评分
 * 
 * 评分规则：
 * - 合约命中词每个 +8
 * - 商业合作命中词每个 +10
 * - 有外链 +15
 * - "review/fees/best exchange" +8
 * - 夸张收益/guaranteed/100x 每个 -20
 */
function calculateRelevanceScore(evidence: MatchedEvidence): number {
  let score = 0
  
  // 合约命中词 +8
  score += evidence.contractKeywords.length * 8
  
  // 商业合作命中词 +10
  score += evidence.commercialKeywords.length * 10
  
  // 有外链 +15
  if (evidence.hasExternalLinks) {
    score += 15
  }
  
  // 质量指标 +8
  score += evidence.qualityIndicators.length * 8
  
  // 风险标记 -20
  score -= evidence.riskFlags.length * 20
  
  // 限制在 0-100 范围
  return Math.max(0, Math.min(100, score))
}

/**
 * 检查是否通过过滤
 * 
 * 至少满足以下 2 条：
 * 1. 标题/描述包含商业合作关键词
 * 2. 标题/描述包含合约语境关键词
 * 3. 视频/频道包含外链
 */
function passesFilter(evidence: MatchedEvidence): {
  passed: boolean
  reason?: string
  conditionsMet: number
} {
  let conditionsMet = 0
  const reasons: string[] = []
  
  // 条件 1: 商业合作关键词
  if (evidence.commercialKeywords.length > 0) {
    conditionsMet++
  } else {
    reasons.push('no commercial keywords')
  }
  
  // 条件 2: 合约语境关键词
  if (evidence.contractKeywords.length > 0) {
    conditionsMet++
  } else {
    reasons.push('no contract keywords')
  }
  
  // 条件 3: 外链
  if (evidence.hasExternalLinks) {
    conditionsMet++
  } else {
    reasons.push('no external links')
  }
  
  const passed = conditionsMet >= 2
  
  return {
    passed,
    reason: passed ? undefined : `Only ${conditionsMet}/3 conditions met: ${reasons.join(', ')}`,
    conditionsMet,
  }
}

/**
 * 分析单个视频或频道
 */
export function analyzeContent(
  title: string,
  description: string,
  videoId?: string,
  channelId?: string
): FilteredItem {
  const combinedText = `${title} ${description}`
  
  // 检测各类关键词
  const commercialKeywords = detectKeywords(combinedText, COMMERCIAL_KEYWORDS)
  const contractKeywords = detectKeywords(combinedText, CONTRACT_KEYWORDS)
  const qualityIndicators = detectKeywords(combinedText, QUALITY_INDICATORS)
  const riskFlags = detectKeywords(combinedText, RISK_FLAGS)
  
  // 检测外链
  const { hasLinks, linkTypes } = detectExternalLinks(description)
  
  // 构建命中证据
  const matchedEvidence: MatchedEvidence = {
    commercialKeywords,
    contractKeywords,
    qualityIndicators,
    riskFlags,
    hasExternalLinks: hasLinks,
    externalLinkTypes: linkTypes,
  }
  
  // 计算相关性评分
  const relevanceScore = calculateRelevanceScore(matchedEvidence)
  
  // 检查是否通过过滤
  const { passed, reason, conditionsMet } = passesFilter(matchedEvidence)
  
  return {
    videoId,
    channelId: channelId || 'unknown',
    title,
    description: description.slice(0, 200), // 保留前 200 字符
    relevanceScore,
    matchedEvidence,
    passedFilter: passed,
    filterReason: reason,
  }
}

/**
 * 批量过滤和排序视频
 */
export function filterAndSortVideos(
  videos: YouTubeVideo[]
): {
  filtered: FilteredItem[]
  rejected: FilteredItem[]
  stats: {
    total: number
    passed: number
    rejected: number
    averageScore: number
    medianScore: number
  }
} {
  const allResults: FilteredItem[] = []
  
  // 分析每个视频
  for (const video of videos) {
    const title = video.snippet?.title || ''
    const description = video.snippet?.description || ''
    const videoId = video.id
    const channelId = video.snippet?.channelId
    
    const result = analyzeContent(title, description, videoId, channelId)
    allResults.push(result)
  }
  
  // 分离通过和未通过的
  const filtered = allResults.filter(r => r.passedFilter)
  const rejected = allResults.filter(r => !r.passedFilter)
  
  // 按相关性评分降序排序
  filtered.sort((a, b) => b.relevanceScore - a.relevanceScore)
  
  // 计算统计信息
  const scores = filtered.map(r => r.relevanceScore)
  const averageScore = scores.length > 0 
    ? scores.reduce((sum, s) => sum + s, 0) / scores.length 
    : 0
  
  const sortedScores = [...scores].sort((a, b) => a - b)
  const medianScore = scores.length > 0
    ? sortedScores[Math.floor(sortedScores.length / 2)]
    : 0
  
  return {
    filtered,
    rejected,
    stats: {
      total: allResults.length,
      passed: filtered.length,
      rejected: rejected.length,
      averageScore: Math.round(averageScore * 10) / 10,
      medianScore,
    },
  }
}

/**
 * 批量过滤和排序频道
 */
export function filterAndSortChannels(
  channels: Array<{
    channelId: string
    channelTitle: string
    description?: string
    videos?: YouTubeVideo[]
  }>
): {
  filtered: FilteredItem[]
  rejected: FilteredItem[]
  stats: {
    total: number
    passed: number
    rejected: number
    averageScore: number
  }
} {
  const allResults: FilteredItem[] = []
  
  // 分析每个频道
  for (const channel of channels) {
    const title = channel.channelTitle || ''
    const description = channel.description || ''
    
    // 如果有视频，合并视频的描述
    let combinedDescription = description
    if (channel.videos && channel.videos.length > 0) {
      const videoDescriptions = channel.videos
        .slice(0, 5) // 只取前 5 个视频
        .map(v => v.snippet?.description || '')
        .join(' ')
      combinedDescription = `${description} ${videoDescriptions}`
    }
    
    const result = analyzeContent(title, combinedDescription, undefined, channel.channelId)
    allResults.push(result)
  }
  
  // 分离通过和未通过的
  const filtered = allResults.filter(r => r.passedFilter)
  const rejected = allResults.filter(r => !r.passedFilter)
  
  // 按相关性评分降序排序
  filtered.sort((a, b) => b.relevanceScore - a.relevanceScore)
  
  // 计算统计信息
  const scores = filtered.map(r => r.relevanceScore)
  const averageScore = scores.length > 0 
    ? scores.reduce((sum, s) => sum + s, 0) / scores.length 
    : 0
  
  return {
    filtered,
    rejected,
    stats: {
      total: allResults.length,
      passed: filtered.length,
      rejected: rejected.length,
      averageScore: Math.round(averageScore * 10) / 10,
    },
  }
}

/**
 * 获取命中证据摘要（用于 UI 显示）
 */
export function getEvidenceSummary(evidence: MatchedEvidence): string[] {
  const summary: string[] = []
  
  if (evidence.commercialKeywords.length > 0) {
    summary.push(`💼 Commercial: ${evidence.commercialKeywords.slice(0, 3).join(', ')}${evidence.commercialKeywords.length > 3 ? '...' : ''}`)
  }
  
  if (evidence.contractKeywords.length > 0) {
    summary.push(`📊 Contract: ${evidence.contractKeywords.slice(0, 3).join(', ')}${evidence.contractKeywords.length > 3 ? '...' : ''}`)
  }
  
  if (evidence.hasExternalLinks) {
    summary.push(`🔗 Links: ${evidence.externalLinkTypes.join(', ')}`)
  }
  
  if (evidence.qualityIndicators.length > 0) {
    summary.push(`✅ Quality: ${evidence.qualityIndicators.slice(0, 2).join(', ')}`)
  }
  
  if (evidence.riskFlags.length > 0) {
    summary.push(`⚠️ Risk: ${evidence.riskFlags.join(', ')}`)
  }
  
  return summary
}

/**
 * 导出为 CSV 格式（包含命中证据）
 */
export function exportToCSV(items: FilteredItem[]): string {
  const headers = [
    'Video ID',
    'Channel ID',
    'Title',
    'Relevance Score',
    'Commercial Keywords',
    'Contract Keywords',
    'Quality Indicators',
    'Risk Flags',
    'Has External Links',
    'Link Types',
    'Passed Filter',
  ]
  
  const rows = items.map(item => [
    item.videoId || '',
    item.channelId,
    item.title,
    item.relevanceScore.toString(),
    item.matchedEvidence.commercialKeywords.join('; '),
    item.matchedEvidence.contractKeywords.join('; '),
    item.matchedEvidence.qualityIndicators.join('; '),
    item.matchedEvidence.riskFlags.join('; '),
    item.matchedEvidence.hasExternalLinks ? 'Yes' : 'No',
    item.matchedEvidence.externalLinkTypes.join('; '),
    item.passedFilter ? 'Yes' : 'No',
  ])
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')),
  ].join('\n')
  
  return csvContent
}

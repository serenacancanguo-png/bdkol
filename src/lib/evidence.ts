/**
 * 证据提取模块
 * 从文本中提取 KOL 与竞品关系的证据
 */

import { Competitor } from './competitors'

/**
 * 证据类型
 */
export enum EvidenceType {
  AFFILIATE_LINK = 'AFFILIATE_LINK',        // 合作链接（partnership link）
  PROMO_CODE = 'PROMO_CODE',                // 推广码
  SPONSORED_DISCLOSURE = 'SPONSORED_DISCLOSURE',  // 赞助声明
  CTA_MENTION = 'CTA_MENTION',              // 行动号召提及
}

/**
 * 证据项
 */
export interface Evidence {
  type: EvidenceType
  snippet: string           // 证据文本片段（最多 160 字）
  matchedTerm: string       // 匹配到的关键词
  confidence: number        // 置信度 (0-1)
  position?: number         // 在原文中的位置
}

/**
 * 提取证据结果
 */
export interface ExtractionResult {
  evidences: Evidence[]
  totalMatches: number
  hasStrongEvidence: boolean  // 是否有强证据（partnership/promo/sponsored）
}

/**
 * 从文本中提取包含关键词的片段
 * @param text 原文本
 * @param keyword 关键词
 * @param maxLength 最大长度（默认 160）
 * @returns 包含关键词的片段
 */
function extractSnippet(text: string, keyword: string, maxLength = 160): string {
  const lowerText = text.toLowerCase()
  const lowerKeyword = keyword.toLowerCase()
  const index = lowerText.indexOf(lowerKeyword)

  if (index === -1) {
    return text.slice(0, maxLength)
  }

  // 尝试提取关键词前后的上下文
  const contextBefore = 40
  const contextAfter = maxLength - contextBefore - keyword.length

  let start = Math.max(0, index - contextBefore)
  let end = Math.min(text.length, index + keyword.length + contextAfter)

  // 尝试在单词边界处截断
  if (start > 0) {
    const spaceIndex = text.lastIndexOf(' ', start + 10)
    if (spaceIndex > start && spaceIndex < start + 20) {
      start = spaceIndex + 1
    }
  }

  if (end < text.length) {
    const spaceIndex = text.indexOf(' ', end - 10)
    if (spaceIndex > end - 20 && spaceIndex < end) {
      end = spaceIndex
    }
  }

  let snippet = text.slice(start, end).trim()

  // 添加省略号
  if (start > 0) snippet = '...' + snippet
  if (end < text.length) snippet = snippet + '...'

  return snippet
}

/**
 * 检测合作链接模式（Partnership Links）
 */
function detectPartnershipLinks(
  text: string,
  patterns: string[]
): Evidence[] {
  const evidences: Evidence[] = []
  const lowerText = text.toLowerCase()

  for (const pattern of patterns) {
    const lowerPattern = pattern.toLowerCase()
    
    // 检查是否包含合作链接模式（如 ref=, invite=, code= 等）
    if (lowerText.includes(lowerPattern)) {
      // 尝试提取完整的链接或参数
      const regex = new RegExp(`[^\\s]*${lowerPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^\\s]*`, 'gi')
      const matches = text.match(regex)

      if (matches) {
        for (const match of matches) {
          evidences.push({
            type: EvidenceType.AFFILIATE_LINK,
            snippet: extractSnippet(text, match, 160),
            matchedTerm: pattern,
            confidence: 0.9,
            position: text.indexOf(match),
          })
        }
      } else {
        evidences.push({
          type: EvidenceType.AFFILIATE_LINK,
          snippet: extractSnippet(text, pattern, 160),
          matchedTerm: pattern,
          confidence: 0.85,
          position: lowerText.indexOf(lowerPattern),
        })
      }
    }
  }

  return evidences
}

/**
 * 检测推广码
 */
function detectPromoCodes(
  text: string,
  intentTerms: string[],
  competitorName: string
): Evidence[] {
  const evidences: Evidence[] = []
  const lowerText = text.toLowerCase()

  // 推广码相关词汇
  const promoKeywords = [
    'promo code', 'promocode', 'discount code', 'referral code',
    'invite code', 'bonus code', 'coupon code', 'code:', 'use code'
  ]

  for (const keyword of promoKeywords) {
    if (lowerText.includes(keyword.toLowerCase())) {
      // 检查是否与竞品名称在同一上下文
      const keywordIndex = lowerText.indexOf(keyword.toLowerCase())
      const competitorIndex = lowerText.indexOf(competitorName.toLowerCase())

      // 如果竞品名称在推广码附近（±200 字符）
      if (competitorIndex !== -1 && Math.abs(keywordIndex - competitorIndex) < 200) {
        evidences.push({
          type: EvidenceType.PROMO_CODE,
          snippet: extractSnippet(text, keyword, 160),
          matchedTerm: keyword,
          confidence: 0.85,
          position: keywordIndex,
        })
      }
    }
  }

  // 检查 intent_terms 中的推广相关词
  const promoIntents = intentTerms.filter(term => 
    ['code', 'promo', 'discount', 'bonus', 'referral', 'invite'].some(kw => 
      term.toLowerCase().includes(kw)
    )
  )

  for (const term of promoIntents) {
    if (lowerText.includes(term.toLowerCase())) {
      evidences.push({
        type: EvidenceType.PROMO_CODE,
        snippet: extractSnippet(text, term, 160),
        matchedTerm: term,
        confidence: 0.75,
        position: lowerText.indexOf(term.toLowerCase()),
      })
    }
  }

  return evidences
}

/**
 * 检测赞助声明
 */
function detectSponsoredDisclosure(
  text: string,
  sponsorTerms: string[]
): Evidence[] {
  const evidences: Evidence[] = []
  const lowerText = text.toLowerCase()

  for (const term of sponsorTerms) {
    const lowerTerm = term.toLowerCase()
    
    if (lowerText.includes(lowerTerm)) {
      // 赞助声明通常置信度较高
      const confidence = term.includes('sponsored') || term.includes('paid') ? 0.95 : 0.8

      evidences.push({
        type: EvidenceType.SPONSORED_DISCLOSURE,
        snippet: extractSnippet(text, term, 160),
        matchedTerm: term,
        confidence,
        position: lowerText.indexOf(lowerTerm),
      })
    }
  }

  return evidences
}

/**
 * 检测行动号召（CTA）
 */
function detectCTAMentions(
  text: string,
  intentTerms: string[],
  competitorName: string
): Evidence[] {
  const evidences: Evidence[] = []
  const lowerText = text.toLowerCase()

  // CTA 关键词
  const ctaKeywords = [
    'sign up', 'signup', 'register', 'join', 'get started',
    'click here', 'check out', 'visit', 'use my link', 'link below',
    'link in description', 'link in bio'
  ]

  for (const keyword of ctaKeywords) {
    if (lowerText.includes(keyword.toLowerCase())) {
      const keywordIndex = lowerText.indexOf(keyword.toLowerCase())
      const competitorIndex = lowerText.indexOf(competitorName.toLowerCase())

      // 如果 CTA 和竞品名称在附近
      if (competitorIndex !== -1 && Math.abs(keywordIndex - competitorIndex) < 150) {
        evidences.push({
          type: EvidenceType.CTA_MENTION,
          snippet: extractSnippet(text, keyword, 160),
          matchedTerm: keyword,
          confidence: 0.7,
          position: keywordIndex,
        })
      }
    }
  }

  // 检查 intent_terms 中的 CTA 相关词
  const ctaIntents = intentTerms.filter(term =>
    ['sign up', 'signup', 'register', 'join', 'ambassador'].some(kw =>
      term.toLowerCase().includes(kw)
    )
  )

  for (const term of ctaIntents) {
    if (lowerText.includes(term.toLowerCase())) {
      evidences.push({
        type: EvidenceType.CTA_MENTION,
        snippet: extractSnippet(text, term, 160),
        matchedTerm: term,
        confidence: 0.65,
        position: lowerText.indexOf(term.toLowerCase()),
      })
    }
  }

  return evidences
}

/**
 * 提取证据
 * @param text 要分析的文本（视频描述、频道简介等）
 * @param competitorConfig 竞品配置
 * @returns 提取结果
 */
export function extractEvidence(
  text: string,
  competitorConfig: Competitor
): ExtractionResult {
  if (!text || !text.trim()) {
    return {
      evidences: [],
      totalMatches: 0,
      hasStrongEvidence: false,
    }
  }

  const allEvidences: Evidence[] = []

  // 1. 检测合作链接（强证据，Partnership Links）
  const partnershipEvidences = detectPartnershipLinks(
    text,
    competitorConfig.partnership_patterns
  )
  allEvidences.push(...partnershipEvidences)

  // 2. 检测推广码（强证据）
  const promoEvidences = detectPromoCodes(
    text,
    competitorConfig.intent_terms,
    competitorConfig.brand_names[0]
  )
  allEvidences.push(...promoEvidences)

  // 3. 检测赞助声明（强证据）
  const sponsoredEvidences = detectSponsoredDisclosure(
    text,
    competitorConfig.sponsor_terms
  )
  allEvidences.push(...sponsoredEvidences)

  // 4. 检测行动号召（弱证据）
  const ctaEvidences = detectCTAMentions(
    text,
    competitorConfig.intent_terms,
    competitorConfig.brand_names[0]
  )
  allEvidences.push(...ctaEvidences)

  // 去重：如果两个证据的位置很接近，保留置信度更高的
  const deduped = deduplicateEvidences(allEvidences)

  // 确定是否有强证据
  const hasStrongEvidence = deduped.some(e =>
    e.type === EvidenceType.AFFILIATE_LINK ||
    e.type === EvidenceType.PROMO_CODE ||
    e.type === EvidenceType.SPONSORED_DISCLOSURE
  )

  return {
    evidences: deduped,
    totalMatches: deduped.length,
    hasStrongEvidence,
  }
}

/**
 * 去重证据
 */
function deduplicateEvidences(evidences: Evidence[]): Evidence[] {
  if (evidences.length === 0) return []

  // 按位置排序
  const sorted = [...evidences].sort((a, b) => (a.position || 0) - (b.position || 0))

  const result: Evidence[] = [sorted[0]]

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i]
    const last = result[result.length - 1]

    // 如果位置相近（±50 字符），保留置信度更高的
    if (current.position && last.position && Math.abs(current.position - last.position) < 50) {
      if (current.confidence > last.confidence) {
        result[result.length - 1] = current
      }
    } else {
      result.push(current)
    }
  }

  return result
}

/**
 * 批量提取证据
 */
export function extractEvidenceBatch(
  texts: string[],
  competitorConfig: Competitor
): ExtractionResult[] {
  return texts.map(text => extractEvidence(text, competitorConfig))
}

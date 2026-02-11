/**
 * 智能查询构建器
 * 根据 competitor/platform/templateId 生成优化的搜索查询
 */

export type QueryBuilderInput = {
  competitor: string
  competitorAliases?: string[] // 从 competitors.yaml 读取的 brand_names
  platform: 'youtube' | 'x'
  templateId: string
}

export type QueryBuilderOutput = {
  finalQuery: string
  components: {
    competitorAnchor: string
    industryAnchor: string
    commercialAnchor: string
    negativeKeywords?: string
  }
}

/**
 * 行业锚点词库（加密货币 + 合约交易）
 */
const INDUSTRY_ANCHORS = {
  crypto: ['crypto', 'cryptocurrency', 'bitcoin', 'ethereum'],
  exchange: ['exchange', 'trading platform'],
  derivatives: ['futures', 'perps', 'perpetual', 'derivatives', 'contract', 'leverage']
}

/**
 * 商业锚点词库（按模板分类）
 */
const COMMERCIAL_ANCHORS = {
  partnership: ['partnership', 'partner program', 'collaborate', 'sponsored'],
  referral: ['referral', 'referral code', 'ref code', 'invite code', 'sign up bonus'],
  rebate: ['rebate', 'fee discount', 'cashback', 'commission', 'reward'],
  review: ['review', 'tutorial', 'how to use', 'guide'],
  promotion: ['promo', 'promo code', 'discount', 'bonus', 'offer']
}

/**
 * LBank 特殊负向关键词（过滤银行/音乐等无关内容）
 */
const LBANK_NEGATIVE_KEYWORDS = [
  '-loan',
  '-mortgage',
  '-credit',
  '-lyrics',
  '-song',
  '-music',
  '-banking',
  '-bank account'
]

/**
 * 根据 templateId 提取商业意图
 */
function getCommercialIntent(templateId: string): string[] {
  if (templateId.includes('partnership')) {
    return COMMERCIAL_ANCHORS.partnership
  }
  if (templateId.includes('referral') || templateId.includes('code')) {
    return COMMERCIAL_ANCHORS.referral
  }
  if (templateId.includes('rebate')) {
    return COMMERCIAL_ANCHORS.rebate
  }
  if (templateId.includes('review') || templateId.includes('tutorial')) {
    return COMMERCIAL_ANCHORS.review
  }
  // 默认：通用促销
  return COMMERCIAL_ANCHORS.promotion
}

/**
 * 构建竞品锚点（主品牌 + 别名）
 */
function buildCompetitorAnchor(competitor: string, aliases?: string[]): string {
  const allNames = [competitor, ...(aliases || [])]
  const uniqueNames = Array.from(new Set(allNames.map(n => n.toLowerCase())))
  
  // 如果只有 1 个名字，直接返回
  if (uniqueNames.length === 1) {
    return uniqueNames[0]
  }
  
  // 如果有多个，使用 OR 语法（但限制最多 3 个，避免查询过长）
  const topNames = uniqueNames.slice(0, 3)
  return `(${topNames.join(' OR ')})`
}

/**
 * 构建行业锚点（加密 + 合约）
 */
function buildIndustryAnchor(templateId: string): string {
  // 默认包含 crypto 和 futures/perps
  const cryptoTerm = 'crypto'
  const derivativesTerm = templateId.includes('futures') ? 'futures' : 'perps'
  
  return `${cryptoTerm} ${derivativesTerm}`
}

/**
 * 核心函数：构建最终查询
 */
export function buildQuery(input: QueryBuilderInput): QueryBuilderOutput {
  const { competitor, competitorAliases, templateId } = input
  
  // 1. 构建竞品锚点
  const competitorAnchor = buildCompetitorAnchor(competitor, competitorAliases)
  
  // 2. 构建行业锚点
  const industryAnchor = buildIndustryAnchor(templateId)
  
  // 3. 构建商业锚点
  const commercialTerms = getCommercialIntent(templateId)
  const commercialAnchor = commercialTerms.slice(0, 2).join(' OR ') // 最多取 2 个关键词
  
  // 4. 组合查询（优先级：竞品 > 行业 > 商业）
  let finalQuery = `${competitorAnchor} ${industryAnchor} ${commercialAnchor}`
  
  // 5. LBank 特殊处理：添加负向关键词
  let negativeKeywords: string | undefined
  if (competitor.toLowerCase() === 'lbank') {
    negativeKeywords = LBANK_NEGATIVE_KEYWORDS.join(' ')
    finalQuery = `${finalQuery} ${negativeKeywords}`
  }
  
  return {
    finalQuery: finalQuery.trim(),
    components: {
      competitorAnchor,
      industryAnchor,
      commercialAnchor,
      negativeKeywords
    }
  }
}

/**
 * 辅助函数：为 Explore Mode 生成查询变体
 */
export function buildExploreQueries(input: QueryBuilderInput): string[] {
  const base = buildQuery(input)
  const queries: string[] = [base.finalQuery]
  
  // 变体 1：添加 "tutorial" 或 "review"
  if (!input.templateId.includes('review')) {
    queries.push(`${base.finalQuery} tutorial`)
  }
  
  // 变体 2：替换商业词（partnership <-> referral）
  if (input.templateId.includes('partnership')) {
    const altQuery = base.finalQuery.replace(/partnership/gi, 'referral program')
    queries.push(altQuery)
  } else if (input.templateId.includes('referral')) {
    const altQuery = base.finalQuery.replace(/referral/gi, 'partnership')
    queries.push(altQuery)
  }
  
  // 变体 3：简化版（只保留核心）
  const simpleQuery = `${base.components.competitorAnchor} ${base.components.industryAnchor}`
  queries.push(simpleQuery)
  
  // 去重并限制最多 4 个
  return Array.from(new Set(queries)).slice(0, 4)
}

/**
 * 调试工具：输出查询构建详情
 */
export function debugQueryBuilder(input: QueryBuilderInput): void {
  const result = buildQuery(input)
  console.log('🔍 Query Builder Debug:')
  console.log('  Competitor:', input.competitor, input.competitorAliases)
  console.log('  Template:', input.templateId)
  console.log('  Final Query:', result.finalQuery)
  console.log('  Components:', result.components)
}

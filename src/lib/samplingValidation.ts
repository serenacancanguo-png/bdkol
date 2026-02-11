/**
 * 抽样验收工具
 * 用于评估 Phantombuster + Google 搜索方案的质量
 */

import type { YouTubeChannel } from './youtube'

/**
 * 验证维度
 */
export type ValidationDimensions = {
  brandMention: boolean        // 品牌相关性（30%）
  partnershipSignal: boolean   // 合作信号（25%）
  futuresSignal: boolean       // 合约交易信号（20%）
  qualityCheck: boolean        // 频道质量（15%）
  activeCheck: boolean         // 活跃度（10%）
}

/**
 * 单条验证结果
 */
export type ValidationResult = {
  channelId: string
  channelTitle: string
  subscriberCount: number
  lastUploadDays: number
  dimensions: ValidationDimensions
  hitScore: number             // 综合得分 (0-100)
  conclusion: 'full_hit' | 'partial_hit' | 'miss'  // 完全命中 / 部分命中 / 不命中
  notes?: string               // 备注
}

/**
 * 抽样验收报告
 */
export type SamplingReport = {
  competitor: string
  query: string
  samplingDate: string
  totalChannels: number
  sampleSize: number
  results: ValidationResult[]
  summary: {
    fullHits: number           // 完全命中数 (>= 80分)
    partialHits: number        // 部分命中数 (60-79分)
    misses: number             // 不命中数 (< 60分)
    hitRate: number            // 综合命中率 (0-100)
    averageScore: number       // 平均得分
  }
  recommendation: {
    rating: 'excellent' | 'good' | 'needs_improvement' | 'unusable'
    suggestions: string[]
  }
}

/**
 * 权重配置
 */
const DIMENSION_WEIGHTS = {
  brandMention: 0.30,
  partnershipSignal: 0.25,
  futuresSignal: 0.20,
  qualityCheck: 0.15,
  activeCheck: 0.10,
}

/**
 * 随机抽样
 */
export function randomSample<T>(array: T[], count: number): T[] {
  if (array.length <= count) return [...array]
  
  const shuffled = [...array].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

/**
 * 计算单条结果的得分
 */
export function calculateHitScore(dimensions: ValidationDimensions): number {
  let score = 0
  
  if (dimensions.brandMention) score += DIMENSION_WEIGHTS.brandMention * 100
  if (dimensions.partnershipSignal) score += DIMENSION_WEIGHTS.partnershipSignal * 100
  if (dimensions.futuresSignal) score += DIMENSION_WEIGHTS.futuresSignal * 100
  if (dimensions.qualityCheck) score += DIMENSION_WEIGHTS.qualityCheck * 100
  if (dimensions.activeCheck) score += DIMENSION_WEIGHTS.activeCheck * 100
  
  return Math.round(score)
}

/**
 * 判断命中类型
 */
export function determineConclusion(score: number): 'full_hit' | 'partial_hit' | 'miss' {
  if (score >= 80) return 'full_hit'
  if (score >= 60) return 'partial_hit'
  return 'miss'
}

/**
 * 计算综合命中率
 * 
 * 完全命中 = 1 分
 * 部分命中 = 0.5 分
 * 不命中 = 0 分
 */
export function calculateHitRate(results: ValidationResult[]): number {
  if (results.length === 0) return 0
  
  const fullHits = results.filter(r => r.conclusion === 'full_hit').length
  const partialHits = results.filter(r => r.conclusion === 'partial_hit').length
  
  const totalScore = fullHits + partialHits * 0.5
  const hitRate = (totalScore / results.length) * 100
  
  return Math.round(hitRate * 10) / 10  // 保留 1 位小数
}

/**
 * 生成建议
 */
export function generateRecommendations(hitRate: number, results: ValidationResult[]): {
  rating: 'excellent' | 'good' | 'needs_improvement' | 'unusable'
  suggestions: string[]
} {
  const suggestions: string[] = []
  
  // 分析不命中原因
  const misses = results.filter(r => r.conclusion === 'miss')
  const missRate = (misses.length / results.length) * 100
  
  // 维度分析
  const brandMentionRate = results.filter(r => r.dimensions.brandMention).length / results.length * 100
  const partnershipRate = results.filter(r => r.dimensions.partnershipSignal).length / results.length * 100
  const futuresRate = results.filter(r => r.dimensions.futuresSignal).length / results.length * 100
  const qualityRate = results.filter(r => r.dimensions.qualityCheck).length / results.length * 100
  const activeRate = results.filter(r => r.dimensions.activeCheck).length / results.length * 100
  
  if (hitRate >= 70) {
    // 优秀
    suggestions.push('✅ 当前 query 质量高，可以继续使用')
    suggestions.push('✅ 可以扩大抓取数量（如 50 → 100 结果）')
    suggestions.push('✅ 可以添加更多竞品或 query 变体')
    
    return { rating: 'excellent', suggestions }
  }
  
  if (hitRate >= 60) {
    // 良好
    suggestions.push('⚠️ Query 基本可用，但需要优化')
    
    if (brandMentionRate < 70) {
      suggestions.push('🔧 品牌相关性偏低，建议在 query 中强化品牌名（如 "WEEX partnership" 而非 "crypto partnership"）')
    }
    
    if (partnershipRate < 60) {
      suggestions.push('🔧 合作信号不足，建议添加更多限定词（如 "sponsored", "referral code", "promo"）')
    }
    
    if (qualityRate < 80) {
      suggestions.push('🔧 频道质量偏低，建议增加后过滤条件（如只保留粉丝数 >= 10k）')
    }
    
    suggestions.push('🔧 调整 site:youtube.com 参数或添加时间限制（如过去 1 年内）')
    
    return { rating: 'good', suggestions }
  }
  
  if (hitRate >= 40) {
    // 需要改进
    suggestions.push('⚠️⚠️ Query 质量偏低，需要显著调整')
    
    if (brandMentionRate < 50) {
      suggestions.push('🔧 品牌相关性严重不足，建议将品牌名作为必需词（用引号包裹："WEEX"）')
    }
    
    if (partnershipRate < 40) {
      suggestions.push('🔧 更换 query 关键词组合：')
      suggestions.push('   - 尝试 "[品牌] partnership futures referral"')
      suggestions.push('   - 尝试 "[品牌] promo code bonus"')
      suggestions.push('   - 尝试 "[品牌] review referral link"')
    }
    
    if (futuresRate < 40) {
      suggestions.push('🔧 合约交易信号不足，添加 "futures", "perpetual", "leverage" 等关键词')
    }
    
    suggestions.push('🔧 分析不命中样本，找出共性问题（是否包含过多新闻/教程类内容？）')
    suggestions.push('🔧 添加排除词（如 -news, -tutorial）排除无关内容')
    
    return { rating: 'needs_improvement', suggestions }
  }
  
  // 不可用
  suggestions.push('❌ 当前 query 不可用，必须重新设计')
  suggestions.push('🔄 重新设计 query：')
  suggestions.push('   - 从用户视角思考：用户会搜什么来找推广视频？')
  suggestions.push('   - 参考竞品官方合作案例')
  suggestions.push('   - 分析高质量样本的共同特征')
  suggestions.push('🔄 切换策略：')
  suggestions.push('   - 尝试用竞品名 + "review" + "referral link"')
  suggestions.push('   - 尝试用竞品名 + "bonus" + "promo"')
  suggestions.push('   - 尝试直接搜索知名 KOL 名字 + 竞品名')
  
  return { rating: 'unusable', suggestions }
}

/**
 * 生成抽样验收报告
 */
export function generateSamplingReport(
  competitor: string,
  query: string,
  allChannels: YouTubeChannel[],
  validations: ValidationResult[]
): SamplingReport {
  // 计算命中统计
  const fullHits = validations.filter(r => r.conclusion === 'full_hit').length
  const partialHits = validations.filter(r => r.conclusion === 'partial_hit').length
  const misses = validations.filter(r => r.conclusion === 'miss').length
  
  // 计算命中率
  const hitRate = calculateHitRate(validations)
  
  // 计算平均得分
  const averageScore = validations.length > 0
    ? Math.round(validations.reduce((sum, r) => sum + r.hitScore, 0) / validations.length)
    : 0
  
  // 生成建议
  const recommendation = generateRecommendations(hitRate, validations)
  
  return {
    competitor,
    query,
    samplingDate: new Date().toISOString().split('T')[0],
    totalChannels: allChannels.length,
    sampleSize: validations.length,
    results: validations,
    summary: {
      fullHits,
      partialHits,
      misses,
      hitRate,
      averageScore,
    },
    recommendation,
  }
}

/**
 * 打印报告（Markdown 格式）
 */
export function printSamplingReport(report: SamplingReport): string {
  const lines: string[] = []
  
  lines.push(`# 抽样验收报告 - ${report.competitor}`)
  lines.push('')
  lines.push(`## 基本信息`)
  lines.push(`- **竞品**: ${report.competitor}`)
  lines.push(`- **Query**: "${report.query}"`)
  lines.push(`- **抓取时间**: ${report.samplingDate}`)
  lines.push(`- **总频道数**: ${report.totalChannels}`)
  lines.push(`- **抽样数量**: ${report.sampleSize}`)
  lines.push('')
  
  lines.push(`## 抽样结果`)
  lines.push('')
  lines.push(`| # | 频道名 | 粉丝数 | 品牌 | 合作 | 合约 | 质量 | 活跃 | 得分 | 结论 |`)
  lines.push(`|---|--------|--------|------|------|------|------|------|------|------|`)
  
  report.results.forEach((r, i) => {
    const brand = r.dimensions.brandMention ? '✅' : '❌'
    const partner = r.dimensions.partnershipSignal ? '✅' : '❌'
    const futures = r.dimensions.futuresSignal ? '✅' : (r.hitScore >= 60 ? '⚠️' : '❌')
    const quality = r.dimensions.qualityCheck ? '✅' : '❌'
    const active = r.dimensions.activeCheck ? '✅' : '❌'
    
    const conclusionEmoji = r.conclusion === 'full_hit' ? '✅ 完全命中' 
      : r.conclusion === 'partial_hit' ? '⚠️ 部分命中'
      : '❌ 不命中'
    
    const subs = r.subscriberCount >= 1000 
      ? `${Math.round(r.subscriberCount / 1000)}k`
      : r.subscriberCount.toString()
    
    lines.push(`| ${i + 1} | ${r.channelTitle.slice(0, 20)} | ${subs} | ${brand} | ${partner} | ${futures} | ${quality} | ${active} | ${r.hitScore} | ${conclusionEmoji} |`)
  })
  
  lines.push('')
  lines.push(`## 统计摘要`)
  lines.push(`- **完全命中** (>= 80分): ${report.summary.fullHits} 条 (${Math.round(report.summary.fullHits / report.sampleSize * 100)}%)`)
  lines.push(`- **部分命中** (60-79分): ${report.summary.partialHits} 条 (${Math.round(report.summary.partialHits / report.sampleSize * 100)}%)`)
  lines.push(`- **不命中** (< 60分): ${report.summary.misses} 条 (${Math.round(report.summary.misses / report.sampleSize * 100)}%)`)
  lines.push('')
  lines.push(`**综合命中率**: \`${report.summary.hitRate}%\` ${report.recommendation.rating === 'excellent' ? '✅' : report.recommendation.rating === 'good' ? '⚠️' : '❌'}`)
  lines.push(`**平均得分**: ${report.summary.averageScore}`)
  lines.push('')
  
  lines.push(`## 结论`)
  const ratingText = {
    excellent: '✅ **优秀**',
    good: '⚠️ **良好**',
    needs_improvement: '⚠️⚠️ **需要改进**',
    unusable: '❌ **不可用**',
  }[report.recommendation.rating]
  
  lines.push(ratingText + ` - ${report.recommendation.rating === 'excellent' ? '当前 query 质量高，可以继续使用' : '需要调整 query'}`)
  lines.push('')
  
  lines.push(`## 建议`)
  report.recommendation.suggestions.forEach(s => {
    lines.push(`${s}`)
  })
  
  lines.push('')
  lines.push(`---`)
  lines.push('')
  lines.push(`*报告生成时间: ${new Date().toISOString()}*`)
  
  return lines.join('\n')
}

/**
 * 导出为 CSV（用于人工验证）
 */
export function exportValidationToCsv(results: ValidationResult[]): string {
  const headers = [
    'Channel ID',
    'Channel Title',
    'Subscriber Count',
    'Last Upload (Days)',
    'Brand Mention',
    'Partnership Signal',
    'Futures Signal',
    'Quality Check',
    'Active Check',
    'Hit Score',
    'Conclusion',
    'Notes',
  ]
  
  const rows = results.map(r => [
    r.channelId,
    `"${r.channelTitle.replace(/"/g, '""')}"`,
    r.subscriberCount,
    r.lastUploadDays,
    r.dimensions.brandMention ? 'Yes' : 'No',
    r.dimensions.partnershipSignal ? 'Yes' : 'No',
    r.dimensions.futuresSignal ? 'Yes' : 'No',
    r.dimensions.qualityCheck ? 'Yes' : 'No',
    r.dimensions.activeCheck ? 'Yes' : 'No',
    r.hitScore,
    r.conclusion === 'full_hit' ? 'Full Hit' : r.conclusion === 'partial_hit' ? 'Partial Hit' : 'Miss',
    r.notes ? `"${r.notes.replace(/"/g, '""')}"` : '',
  ].join(','))
  
  return '\uFEFF' + [headers.join(','), ...rows].join('\n')
}

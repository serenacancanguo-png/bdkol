/**
 * Quota Guard（配额守卫）
 * 在运行前预判配额消耗，自动降级或拒绝执行
 */

/**
 * 配额守卫配置
 */
export type QuotaGuardConfig = {
  maxSearchUnitsPerRun: number  // 每次运行最多 search.list 配额（units）
  enableAutoDowngrade: boolean  // 是否启用自动降级
  minQueriesPerCompetitor: number  // 降级后最少保留的 query 数
  maxResultsPerQuery: number    // 每个 query 的最大结果数
  allowPagination: boolean      // 是否允许翻页
}

/**
 * 配额守卫预设
 */
export const QUOTA_GUARD_PRESETS = {
  // 宽松模式（允许较高配额消耗）
  relaxed: {
    maxSearchUnitsPerRun: 500,
    enableAutoDowngrade: true,
    minQueriesPerCompetitor: 3,
    maxResultsPerQuery: 25,
    allowPagination: true,
  },
  
  // 标准模式（推荐）
  standard: {
    maxSearchUnitsPerRun: 300,
    enableAutoDowngrade: true,
    minQueriesPerCompetitor: 2,
    maxResultsPerQuery: 20,
    allowPagination: false,  // P=1
  },
  
  // 严格模式（配额紧张时）
  strict: {
    maxSearchUnitsPerRun: 200,
    enableAutoDowngrade: true,
    minQueriesPerCompetitor: 2,
    maxResultsPerQuery: 15,
    allowPagination: false,
  },
  
  // 极省模式
  ultraStrict: {
    maxSearchUnitsPerRun: 100,
    enableAutoDowngrade: true,
    minQueriesPerCompetitor: 1,
    maxResultsPerQuery: 10,
    allowPagination: false,
  },
} as const

export type QuotaGuardPreset = keyof typeof QUOTA_GUARD_PRESETS

/**
 * 配额预估结果
 */
export type QuotaEstimate = {
  queriesCount: number           // 查询数量
  pagesPerQuery: number          // 每个查询的页数
  maxResultsPerQuery: number     // 每个查询的最大结果数
  estimatedSearchCalls: number   // 预计 search.list 调用次数（Q*P）
  estimatedSearchUnits: number   // 预计 search.list 配额消耗（Q*P*100）
  estimatedTotalUnits: number    // 预计总配额消耗（含 videos/channels）
  exceedsBudget: boolean         // 是否超出预算
  budgetLimit: number            // 预算限制
}

/**
 * 降级决策
 */
export type DowngradeDecision = {
  shouldDowngrade: boolean       // 是否需要降级
  reason: string                 // 降级原因
  originalEstimate: QuotaEstimate  // 原始预估
  downgradedEstimate?: QuotaEstimate  // 降级后预估
  downgradeActions: string[]     // 降级操作列表
  canProceed: boolean            // 是否可以继续执行
  recommendation?: string        // 建议（如果无法继续）
}

/**
 * Quota Guard 类
 */
export class QuotaGuard {
  private config: QuotaGuardConfig
  
  constructor(preset: QuotaGuardPreset = 'standard') {
    this.config = { ...QUOTA_GUARD_PRESETS[preset] }
  }
  
  /**
   * 预估配额消耗
   */
  estimateQuota(
    queriesCount: number,
    pagesPerQuery: number = 1,
    maxResultsPerQuery: number = 20
  ): QuotaEstimate {
    const estimatedSearchCalls = queriesCount * pagesPerQuery
    const estimatedSearchUnits = estimatedSearchCalls * 100
    
    // 预估 videos.list 和 channels.list（粗略估算）
    const estimatedVideos = estimatedSearchCalls * maxResultsPerQuery
    const estimatedVideosUnits = Math.ceil(estimatedVideos / 50)
    const estimatedChannelsUnits = Math.ceil(estimatedVideos * 0.5 / 50)
    
    const estimatedTotalUnits = estimatedSearchUnits + estimatedVideosUnits + estimatedChannelsUnits
    
    return {
      queriesCount,
      pagesPerQuery,
      maxResultsPerQuery,
      estimatedSearchCalls,
      estimatedSearchUnits,
      estimatedTotalUnits,
      exceedsBudget: estimatedSearchUnits > this.config.maxSearchUnitsPerRun,
      budgetLimit: this.config.maxSearchUnitsPerRun,
    }
  }
  
  /**
   * 检查并决定是否需要降级
   */
  checkAndDowngrade(
    queries: string[],
    pagesPerQuery: number = 1,
    maxResultsPerQuery: number = 20
  ): DowngradeDecision {
    // 原始预估
    const originalEstimate = this.estimateQuota(queries.length, pagesPerQuery, maxResultsPerQuery)
    
    // 如果不超预算，直接通过
    if (!originalEstimate.exceedsBudget) {
      return {
        shouldDowngrade: false,
        reason: 'Within budget',
        originalEstimate,
        downgradeActions: [],
        canProceed: true,
      }
    }
    
    // 超出预算，尝试降级
    if (!this.config.enableAutoDowngrade) {
      return {
        shouldDowngrade: false,
        reason: 'Auto downgrade disabled',
        originalEstimate,
        downgradeActions: [],
        canProceed: false,
        recommendation: `预算不足。预计消耗 ${originalEstimate.estimatedSearchUnits} units，但预算只有 ${this.config.maxSearchUnitsPerRun} units。建议：\n1）使用离线回放模式（0 配额）\n2）等待配额重置（每天 UTC 00:00 / 北京 08:00）\n3）使用其他 API Key`,
      }
    }
    
    // 🆕 自动降级策略
    const downgradeActions: string[] = []
    let downgradedQueries = queries.length
    let downgradedPages = pagesPerQuery
    let downgradedMaxResults = maxResultsPerQuery
    
    // 降级 1：只保留前 N 条 query
    if (downgradedQueries > this.config.minQueriesPerCompetitor) {
      downgradedQueries = this.config.minQueriesPerCompetitor
      downgradeActions.push(`Reduced queries: ${queries.length} → ${downgradedQueries}`)
    }
    
    // 降级 2：禁止翻页（P=1）
    if (downgradedPages > 1 && !this.config.allowPagination) {
      downgradedPages = 1
      downgradeActions.push(`Disabled pagination: P=${pagesPerQuery} → P=1`)
    }
    
    // 降级 3：降低 maxResults
    if (downgradedMaxResults > this.config.maxResultsPerQuery) {
      downgradedMaxResults = this.config.maxResultsPerQuery
      downgradeActions.push(`Reduced maxResults: ${maxResultsPerQuery} → ${downgradedMaxResults}`)
    }
    
    // 计算降级后的预估
    const downgradedEstimate = this.estimateQuota(
      downgradedQueries,
      downgradedPages,
      downgradedMaxResults
    )
    
    // 检查降级后是否仍超预算
    if (downgradedEstimate.exceedsBudget) {
      return {
        shouldDowngrade: true,
        reason: `Exceeds budget even after downgrade (${downgradedEstimate.estimatedSearchUnits} > ${this.config.maxSearchUnitsPerRun})`,
        originalEstimate,
        downgradedEstimate,
        downgradeActions,
        canProceed: false,
        recommendation: `降级后仍超预算。预计消耗 ${downgradedEstimate.estimatedSearchUnits} units，但预算只有 ${this.config.maxSearchUnitsPerRun} units。\n\n建议：\n1）使用离线回放模式（0 配额）\n2）等待配额重置（每天 UTC 00:00 / 北京 08:00）\n3）使用其他 API Key\n4）切换到更严格的预设（ultraStrict: 100 units）`,
      }
    }
    
    // 降级成功，可以继续
    return {
      shouldDowngrade: true,
      reason: `Auto downgraded to fit budget (${downgradedEstimate.estimatedSearchUnits} <= ${this.config.maxSearchUnitsPerRun})`,
      originalEstimate,
      downgradedEstimate,
      downgradeActions,
      canProceed: true,
    }
  }
  
  /**
   * 生成配额守卫报告
   */
  generateReport(decision: DowngradeDecision): string {
    const lines = [
      '🛡️ Quota Guard Report',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '',
      '📊 Original Estimate:',
      `  • Queries: ${decision.originalEstimate.queriesCount}`,
      `  • Pages/Query: ${decision.originalEstimate.pagesPerQuery}`,
      `  • MaxResults: ${decision.originalEstimate.maxResultsPerQuery}`,
      `  • Search Calls: ${decision.originalEstimate.estimatedSearchCalls}`,
      `  • Search Units: ${decision.originalEstimate.estimatedSearchUnits}`,
      `  • Budget Limit: ${decision.originalEstimate.budgetLimit}`,
      `  • Exceeds Budget: ${decision.originalEstimate.exceedsBudget ? '❌ YES' : '✅ NO'}`,
      '',
    ]
    
    if (decision.shouldDowngrade && decision.downgradedEstimate) {
      lines.push(
        '⬇️ Downgraded Estimate:',
        `  • Queries: ${decision.downgradedEstimate.queriesCount}`,
        `  • Pages/Query: ${decision.downgradedEstimate.pagesPerQuery}`,
        `  • MaxResults: ${decision.downgradedEstimate.maxResultsPerQuery}`,
        `  • Search Calls: ${decision.downgradedEstimate.estimatedSearchCalls}`,
        `  • Search Units: ${decision.downgradedEstimate.estimatedSearchUnits}`,
        `  • Exceeds Budget: ${decision.downgradedEstimate.exceedsBudget ? '❌ YES' : '✅ NO'}`,
        '',
        '🔧 Downgrade Actions:',
        ...decision.downgradeActions.map(action => `  • ${action}`),
        '',
      )
    }
    
    lines.push(
      `Decision: ${decision.canProceed ? '✅ PROCEED' : '❌ BLOCKED'}`,
      `Reason: ${decision.reason}`,
    )
    
    if (decision.recommendation) {
      lines.push(
        '',
        '💡 Recommendation:',
        ...decision.recommendation.split('\n').map(line => `  ${line}`),
      )
    }
    
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    return lines.join('\n')
  }
  
  /**
   * 获取配置
   */
  getConfig(): QuotaGuardConfig {
    return { ...this.config }
  }
}

/**
 * 应用降级决策到查询参数
 */
export function applyDowngrade(
  queries: string[],
  decision: DowngradeDecision
): {
  queries: string[]
  pagesPerQuery: number
  maxResultsPerQuery: number
} {
  if (!decision.shouldDowngrade || !decision.downgradedEstimate) {
    return {
      queries,
      pagesPerQuery: decision.originalEstimate.pagesPerQuery,
      maxResultsPerQuery: decision.originalEstimate.maxResultsPerQuery,
    }
  }
  
  return {
    queries: queries.slice(0, decision.downgradedEstimate.queriesCount),
    pagesPerQuery: decision.downgradedEstimate.pagesPerQuery,
    maxResultsPerQuery: decision.downgradedEstimate.maxResultsPerQuery,
  }
}

/**
 * 快捷函数：检查配额并获取建议
 */
export function checkQuotaBeforeRun(
  queriesCount: number,
  maxSearchUnits: number = 300,
  pagesPerQuery: number = 1,
  maxResultsPerQuery: number = 20
): {
  canProceed: boolean
  estimatedUnits: number
  recommendation: string
} {
  const estimatedSearchCalls = queriesCount * pagesPerQuery
  const estimatedUnits = estimatedSearchCalls * 100
  
  if (estimatedUnits <= maxSearchUnits) {
    return {
      canProceed: true,
      estimatedUnits,
      recommendation: `✅ Within budget (${estimatedUnits}/${maxSearchUnits} units)`,
    }
  }
  
  // 尝试降级
  const downgradedQueries = Math.min(queriesCount, 2)
  const downgradedPages = 1
  const downgradedMaxResults = 20
  
  const downgradedCalls = downgradedQueries * downgradedPages
  const downgradedUnits = downgradedCalls * 100
  
  if (downgradedUnits <= maxSearchUnits) {
    return {
      canProceed: true,
      estimatedUnits: downgradedUnits,
      recommendation: `⚠️ Auto downgraded (${estimatedUnits} → ${downgradedUnits} units):\n` +
        `  • Queries: ${queriesCount} → ${downgradedQueries}\n` +
        `  • Pages: ${pagesPerQuery} → ${downgradedPages}\n` +
        `  • MaxResults: ${maxResultsPerQuery} → ${downgradedMaxResults}`,
    }
  }
  
  // 降级后仍超预算
  return {
    canProceed: false,
    estimatedUnits: downgradedUnits,
    recommendation: `❌ Budget insufficient even after downgrade (${downgradedUnits} > ${maxSearchUnits} units).\n\n` +
      `建议：\n` +
      `1）使用离线回放模式（0 配额）\n` +
      `2）等待配额重置（每天 UTC 00:00 / 北京 08:00）\n` +
      `3）使用其他 API Key\n` +
      `4）切换到 ultraStrict 模式（100 units 预算）`,
  }
}

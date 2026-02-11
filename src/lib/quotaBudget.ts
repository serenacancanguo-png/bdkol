/**
 * 配额预算配置与管理
 * YouTube Data API 配额优化核心模块
 */

/**
 * 配额预算配置
 */
export type QuotaBudgetConfig = {
  maxSearchCallsPerRun: number        // 每次运行最多 search.list 调用次数
  maxPagesPerQuery: number            // 每个查询最多翻页次数（1=仅第一页）
  maxCandidatesPerCompetitor: number  // 每个竞品最多候选视频数
  maxChannelsToAnalyze: number        // 最多分析的频道数（过滤后）
  maxVideosPerChannel: number         // 每个频道最多抓取视频数
}

/**
 * 预设配额方案
 */
export const QUOTA_PRESETS = {
  // 极省模式（~50-100 units）
  ultraSaving: {
    maxSearchCallsPerRun: 1,
    maxPagesPerQuery: 1,
    maxCandidatesPerCompetitor: 10,
    maxChannelsToAnalyze: 10,
    maxVideosPerChannel: 3,
  },
  
  // 测试模式（~100-200 units）
  test: {
    maxSearchCallsPerRun: 2,
    maxPagesPerQuery: 1,
    maxCandidatesPerCompetitor: 20,
    maxChannelsToAnalyze: 20,
    maxVideosPerChannel: 5,
  },
  
  // 标准模式（~300-500 units）
  standard: {
    maxSearchCallsPerRun: 3,
    maxPagesPerQuery: 1,
    maxCandidatesPerCompetitor: 50,
    maxChannelsToAnalyze: 50,
    maxVideosPerChannel: 10,
  },
  
  // 完整模式（~800-1200 units）
  full: {
    maxSearchCallsPerRun: 5,
    maxPagesPerQuery: 2,
    maxCandidatesPerCompetitor: 100,
    maxChannelsToAnalyze: 80,
    maxVideosPerChannel: 15,
  },
} as const

export type QuotaPreset = keyof typeof QUOTA_PRESETS

/**
 * 配额使用统计
 */
export type QuotaUsageStats = {
  searchCalls: number          // search.list 调用次数
  videosCalls: number          // videos.list 调用次数
  channelsCalls: number        // channels.list 调用次数
  cacheHits: number            // 缓存命中次数
  estimatedUnitsUsed: number   // 预估消耗的配额单位
  quotaBudget: QuotaBudgetConfig  // 使用的预算配置
  budgetExceeded: boolean      // 是否超出预算
}

/**
 * 配额预算管理器
 */
export class QuotaBudgetManager {
  private config: QuotaBudgetConfig
  private stats: QuotaUsageStats
  
  constructor(preset: QuotaPreset = 'standard') {
    this.config = { ...QUOTA_PRESETS[preset] }
    this.stats = {
      searchCalls: 0,
      videosCalls: 0,
      channelsCalls: 0,
      cacheHits: 0,
      estimatedUnitsUsed: 0,
      quotaBudget: this.config,
      budgetExceeded: false,
    }
  }
  
  /**
   * 获取配额配置
   */
  getConfig(): QuotaBudgetConfig {
    return { ...this.config }
  }
  
  /**
   * 获取配额统计
   */
  getStats(): QuotaUsageStats {
    return { ...this.stats }
  }
  
  /**
   * 检查是否可以进行 search.list 调用
   */
  canMakeSearchCall(): boolean {
    return this.stats.searchCalls < this.config.maxSearchCallsPerRun
  }
  
  /**
   * 记录 search.list 调用
   */
  recordSearchCall(cached: boolean = false) {
    if (cached) {
      this.stats.cacheHits++
    } else {
      this.stats.searchCalls++
      this.stats.estimatedUnitsUsed += 100  // search.list = 100 units
    }
    
    // 检查是否超出预算
    if (this.stats.searchCalls >= this.config.maxSearchCallsPerRun) {
      this.stats.budgetExceeded = true
    }
  }
  
  /**
   * 记录 videos.list 调用
   */
  recordVideosCall(count: number = 1) {
    this.stats.videosCalls += count
    this.stats.estimatedUnitsUsed += count  // videos.list = 1 unit/call
  }
  
  /**
   * 记录 channels.list 调用
   */
  recordChannelsCall(count: number = 1) {
    this.stats.channelsCalls += count
    this.stats.estimatedUnitsUsed += count  // channels.list = 1 unit/call
  }
  
  /**
   * 预估完整运行所需配额
   */
  estimateFullRunCost(): number {
    const searchCost = this.config.maxSearchCallsPerRun * 100
    
    // 假设每个 search 返回 20 个结果
    const estimatedVideos = this.config.maxSearchCallsPerRun * 20
    const videosCost = Math.ceil(estimatedVideos / 50)  // 批量 50 个
    
    // 假设 50% 去重后的频道数
    const estimatedChannels = Math.min(
      Math.ceil(estimatedVideos * 0.5),
      this.config.maxChannelsToAnalyze
    )
    const channelsCost = Math.ceil(estimatedChannels / 50)  // 批量 50 个
    
    return searchCost + videosCost + channelsCost
  }
  
  /**
   * 生成预算报告
   */
  generateReport(): string {
    const estimate = this.estimateFullRunCost()
    
    return `
📊 Quota Budget Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Budget Configuration:
  • Max Search Calls: ${this.config.maxSearchCallsPerRun}
  • Max Pages/Query: ${this.config.maxPagesPerQuery}
  • Max Candidates: ${this.config.maxCandidatesPerCompetitor}
  • Max Channels: ${this.config.maxChannelsToAnalyze}
  • Max Videos/Channel: ${this.config.maxVideosPerChannel}

Current Usage:
  • search.list: ${this.stats.searchCalls} calls (${this.stats.searchCalls * 100} units)
  • videos.list: ${this.stats.videosCalls} calls (${this.stats.videosCalls} units)
  • channels.list: ${this.stats.channelsCalls} calls (${this.stats.channelsCalls} units)
  • Cache Hits: ${this.stats.cacheHits} (saved ~${this.stats.cacheHits * 100} units)
  
Total Consumed: ${this.stats.estimatedUnitsUsed} units
Estimated Full Run: ${estimate} units
Budget Status: ${this.stats.budgetExceeded ? '⚠️ EXCEEDED' : '✅ OK'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `.trim()
  }
}

/**
 * 获取预设配额方案的预估成本
 */
export function getPresetEstimatedCost(preset: QuotaPreset): number {
  const manager = new QuotaBudgetManager(preset)
  return manager.estimateFullRunCost()
}

/**
 * 所有预设方案的对比
 */
export function getAllPresetsComparison() {
  return Object.entries(QUOTA_PRESETS).map(([name, config]) => ({
    name,
    config,
    estimatedCost: getPresetEstimatedCost(name as QuotaPreset),
  }))
}

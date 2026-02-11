/**
 * 语境过滤与排序 - 测试脚本
 * 
 * 用法：
 * npx tsx scripts/test-context-filter.ts
 */

import { 
  analyzeContent, 
  filterAndSortVideos, 
  getEvidenceSummary,
  exportToCSV 
} from '../src/lib/contextFilter'

// 模拟 YouTube 视频数据
const mockVideos = [
  {
    id: 'video1',
    snippet: {
      title: 'WEEX Exchange Review - Best Futures Trading with 50% Referral Bonus',
      description: 'Get my exclusive promo code for WEEX exchange. Sign up here: https://weex.com/ref/123ABC. This partnership offers perpetual futures, low fees, and amazing leverage up to 100x. Join now!',
      channelId: 'channel1',
      channelTitle: 'Crypto Trader Pro',
    },
  },
  {
    id: 'video2',
    snippet: {
      title: 'Guaranteed 1000x Profit - Easy Money Trading Strategy',
      description: 'Make money fast with this strategy. No risk, instant profits guaranteed! You can\'t lose with this method.',
      channelId: 'channel2',
      channelTitle: 'Quick Rich Schemes',
    },
  },
  {
    id: 'video3',
    snippet: {
      title: 'Understanding Funding Rates and Open Interest in Futures Trading',
      description: 'In this video, I explain funding rates, open interest (OI), liquidation levels, and mark price in perpetual futures. Learn about cross margin vs isolated margin and how to manage your long/short positions. Partnership link: bit.ly/futurestrading',
      channelId: 'channel3',
      channelTitle: 'Futures Academy',
    },
  },
  {
    id: 'video4',
    snippet: {
      title: 'Bitcoin Price Prediction',
      description: 'My thoughts on where Bitcoin is heading next week.',
      channelId: 'channel4',
      channelTitle: 'Crypto News',
    },
  },
  {
    id: 'video5',
    snippet: {
      title: 'Top 5 Exchanges Comparison - Fees, Features, and Promo Codes',
      description: 'Comparing the best crypto exchanges. Use my invite code for WEEX: https://weex.com/invite/ABC123. They offer futures trading with competitive fees and rebates. Join my Discord for more tips: discord.gg/crypto',
      channelId: 'channel5',
      channelTitle: 'Crypto Reviewer',
    },
  },
]

console.log('=' 50)')
console.log('🧪 Context Filter & Sorting - Test Script')
console.log('='.repeat(50) + '\n')

// 测试 1: 分析单个视频
console.log('📝 Test 1: Analyzing Individual Videos\n')

mockVideos.forEach((video, index) => {
  const result = analyzeContent(
    video.snippet.title,
    video.snippet.description,
    video.id,
    video.snippet.channelId
  )
  
  console.log(`Video ${index + 1}: ${video.snippet.title.slice(0, 50)}...`)
  console.log(`  Relevance Score: ${result.relevanceScore}`)
  console.log(`  Passed Filter: ${result.passedFilter ? '✅' : '❌'}`)
  if (!result.passedFilter) {
    console.log(`  Reason: ${result.filterReason}`)
  }
  console.log(`  Evidence:`)
  const summary = getEvidenceSummary(result.matchedEvidence)
  summary.forEach(s => console.log(`    ${s}`))
  console.log()
})

// 测试 2: 批量过滤和排序
console.log('\n' + '='.repeat(50))
console.log('📊 Test 2: Batch Filter & Sort\n')

const { filtered, rejected, stats } = filterAndSortVideos(mockVideos as any[])

console.log(`Total Videos: ${stats.total}`)
console.log(`✅ Passed Filter: ${stats.passed}`)
console.log(`❌ Rejected: ${stats.rejected}`)
console.log(`📈 Average Score: ${stats.averageScore}`)
console.log(`📊 Median Score: ${stats.medianScore}\n`)

// 测试 3: 显示通过过滤的视频（按评分排序）
console.log('='.repeat(50))
console.log('🎯 Top Passed Videos (Sorted by Relevance)\n')

filtered.forEach((item, index) => {
  console.log(`${index + 1}. [Score: ${item.relevanceScore}] ${item.title.slice(0, 60)}`)
  const summary = getEvidenceSummary(item.matchedEvidence)
  summary.forEach(s => console.log(`   ${s}`))
  console.log()
})

// 测试 4: 显示被拒绝的视频
if (rejected.length > 0) {
  console.log('='.repeat(50))
  console.log('❌ Rejected Videos\n')
  
  rejected.forEach((item, index) => {
    console.log(`${index + 1}. [Score: ${item.relevanceScore}] ${item.title.slice(0, 60)}`)
    console.log(`   Reason: ${item.filterReason}`)
    console.log()
  })
}

// 测试 5: CSV 导出
console.log('='.repeat(50))
console.log('📄 CSV Export Sample\n')

const csv = exportToCSV(filtered)
const csvLines = csv.split('\n')
console.log(csvLines[0]) // Header
if (csvLines.length > 1) {
  console.log(csvLines[1]) // First row
}

console.log('\n' + '='.repeat(50))
console.log('✅ All tests completed!')
console.log('='.repeat(50))

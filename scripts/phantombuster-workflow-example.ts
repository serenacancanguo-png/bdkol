/**
 * Phantombuster + Google 搜索工作流示例
 * 
 * 演示如何处理 Phantombuster Google Search 导出的结果，
 * 并使用 YouTube Data API 批量验证频道信息。
 */

import {
  extractYouTubeUrlsFromGoogleResults,
  parseYouTubeUrlsBatch,
  type GoogleSearchResult,
} from '../src/lib/youtubeUrlParser'

import {
  batchProcessYouTubeData,
} from '../src/lib/youtubeBatchApi'

import {
  randomSample,
  calculateHitScore,
  determineConclusion,
  generateSamplingReport,
  printSamplingReport,
  exportValidationToCsv,
  type ValidationDimensions,
  type ValidationResult,
} from '../src/lib/samplingValidation'

/**
 * 模拟 Phantombuster Google Search 导出的结果
 */
const MOCK_GOOGLE_RESULTS: GoogleSearchResult[] = [
  {
    query: 'WEEX partnership futures trading referral site:youtube.com',
    title: 'WEEX Exchange Review | Best Crypto Futures Referral',
    link: 'https://www.youtube.com/watch?v=abc123XYZ',
    description: 'Use my WEEX referral code for 20% off trading fees. Partnership program details...',
    position: 1,
  },
  {
    query: 'WEEX partnership futures trading referral site:youtube.com',
    title: 'How to Trade Futures on WEEX - Complete Guide',
    link: 'https://www.youtube.com/watch?v=def456ABC',
    description: 'Learn futures trading on WEEX. Sign up with my promo code...',
    position: 2,
  },
  {
    query: 'WEEX partnership futures trading referral site:youtube.com',
    title: 'CryptoKing Channel',
    link: 'https://www.youtube.com/channel/UCxyz1234567890abcdefghij',
    description: 'Crypto trading tips and exchange reviews',
    position: 3,
  },
  {
    query: 'WEEX promo code futures exchange bonus site:youtube.com',
    title: 'WEEX Bonus Code 2026 - Get $100 Free',
    link: 'https://www.youtube.com/@TraderJoe',
    description: 'Latest WEEX promo codes and bonuses...',
    position: 1,
  },
  // ... 更多结果
]

/**
 * 主工作流
 */
async function main() {
  console.log('🚀 Phantombuster + Google Search Workflow\n')
  console.log('=' .repeat(60))
  
  // ============================================================
  // Step 1: 从 Google 结果提取 YouTube URLs
  // ============================================================
  console.log('\n📥 Step 1: Extracting YouTube URLs from Google results...\n')
  
  const extractedUrls = extractYouTubeUrlsFromGoogleResults(MOCK_GOOGLE_RESULTS)
  
  console.log(`[Extract] Found ${extractedUrls.length} YouTube URLs`)
  extractedUrls.forEach((item, i) => {
    console.log(`  ${i + 1}. ${item.url}`)
    console.log(`     Source: "${item.sourceTitle.slice(0, 50)}..." (Position ${item.sourcePosition})`)
  })
  
  // ============================================================
  // Step 2: 解析 URL 为 ID（去重）
  // ============================================================
  console.log('\n\n🔍 Step 2: Parsing URLs to IDs...\n')
  
  const urls = extractedUrls.map(item => item.url)
  const parsed = parseYouTubeUrlsBatch(urls)
  
  console.log(`[Parse] Results:`)
  console.log(`  - Video IDs: ${parsed.videos.length}`)
  console.log(`  - Channel IDs: ${parsed.channels.length}`)
  console.log(`  - Handles: ${parsed.handles.length}`)
  console.log(`  - Custom URLs: ${parsed.customUrls.length}`)
  console.log(`  - Invalid: ${parsed.invalid.length}`)
  
  if (parsed.videos.length > 0) {
    console.log(`\n  Video IDs:`)
    parsed.videos.forEach(id => console.log(`    - ${id}`))
  }
  
  if (parsed.channels.length > 0) {
    console.log(`\n  Channel IDs:`)
    parsed.channels.forEach(id => console.log(`    - ${id}`))
  }
  
  if (parsed.handles.length > 0) {
    console.log(`\n  Handles:`)
    parsed.handles.forEach(h => console.log(`    - @${h}`))
  }
  
  // ============================================================
  // Step 3: 批量调用 YouTube API
  // ============================================================
  console.log('\n\n📡 Step 3: Fetching data from YouTube API...\n')
  console.log('=' .repeat(60))
  
  const result = await batchProcessYouTubeData(
    parsed.videos,
    parsed.channels,
    parsed.handles
  )
  
  console.log('=' .repeat(60))
  console.log('\n✅ API Processing Complete!')
  console.log(`   - Channels: ${result.channels.length}`)
  console.log(`   - Videos: ${result.videos.length}`)
  console.log(`   - Quota Used: ${result.quotaUsed} units`)
  
  if (result.errors.length > 0) {
    console.log(`\n⚠️ Errors encountered:`)
    result.errors.forEach(err => console.log(`   - ${err}`))
  }
  
  // ============================================================
  // Step 4: 抽样验收（模拟人工验证）
  // ============================================================
  console.log('\n\n🎲 Step 4: Sampling and validation...\n')
  console.log('=' .repeat(60))
  
  if (result.channels.length === 0) {
    console.log('❌ No channels to sample')
    return
  }
  
  // 随机抽取 20 条（或全部，如果少于 20 条）
  const sampleSize = Math.min(20, result.channels.length)
  const sampledChannels = randomSample(result.channels, sampleSize)
  
  console.log(`[Sample] Randomly selected ${sampledChannels.length} channels for validation\n`)
  
  // 模拟人工验证（这里使用简单规则，实际应该人工检查）
  const validations: ValidationResult[] = sampledChannels.map(channel => {
    const title = channel.snippet?.title || ''
    const description = channel.snippet?.description || ''
    const subs = parseInt(channel.statistics?.subscriberCount || '0')
    
    // 简化的自动验证规则（实际应该人工验证）
    const dimensions: ValidationDimensions = {
      brandMention: /WEEX/i.test(title) || /WEEX/i.test(description),
      partnershipSignal: /partnership|referral|promo|code|bonus|sponsored/i.test(description),
      futuresSignal: /futures|perpetual|leverage|derivatives/i.test(description),
      qualityCheck: subs >= 5000,
      activeCheck: true,  // 简化处理，假设都活跃
    }
    
    const hitScore = calculateHitScore(dimensions)
    const conclusion = determineConclusion(hitScore)
    
    return {
      channelId: channel.id,
      channelTitle: title,
      subscriberCount: subs,
      lastUploadDays: 30,  // 简化处理
      dimensions,
      hitScore,
      conclusion,
    }
  })
  
  // ============================================================
  // Step 5: 生成报告
  // ============================================================
  console.log('\n📊 Step 5: Generating sampling report...\n')
  console.log('=' .repeat(60))
  
  const report = generateSamplingReport(
    'WEEX',
    'WEEX partnership futures trading referral site:youtube.com',
    result.channels,
    validations
  )
  
  // 打印 Markdown 报告
  const markdownReport = printSamplingReport(report)
  console.log(markdownReport)
  
  // ============================================================
  // Step 6: 导出 CSV（可选）
  // ============================================================
  console.log('\n\n📤 Step 6: Exporting validation results to CSV...\n')
  
  const csvContent = exportValidationToCsv(validations)
  console.log('[CSV Export] Ready for download')
  console.log(`[CSV] Total rows: ${validations.length + 1} (including header)`)
  console.log(`[CSV] Size: ${csvContent.length} bytes`)
  
  // 实际使用时，可以写入文件：
  // fs.writeFileSync('validation_results.csv', csvContent, 'utf-8')
  
  // ============================================================
  // 完成
  // ============================================================
  console.log('\n' + '=' .repeat(60))
  console.log('✅ Workflow Complete!')
  console.log('=' .repeat(60))
  console.log(`\n📊 Final Stats:`)
  console.log(`   - Total Google Results: ${MOCK_GOOGLE_RESULTS.length}`)
  console.log(`   - YouTube URLs Extracted: ${extractedUrls.length}`)
  console.log(`   - Channels Retrieved: ${result.channels.length}`)
  console.log(`   - Quota Used: ${result.quotaUsed} units`)
  console.log(`   - Hit Rate: ${report.summary.hitRate}%`)
  console.log(`   - Recommendation: ${report.recommendation.rating}`)
  console.log('')
}

// 运行示例
if (require.main === module) {
  main().catch(console.error)
}

export { main }

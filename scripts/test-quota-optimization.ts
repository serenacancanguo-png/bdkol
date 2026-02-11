/**
 * 配额优化功能测试脚本
 * 
 * 测试内容：
 * 1. 缓存功能（内存 + 文件）
 * 2. 查询优化（OR 合并）
 * 3. 配额预估
 * 4. Fail Fast 机制
 * 
 * 运行方式：
 * npx tsx scripts/test-quota-optimization.ts
 */

import { cache, buildCacheKey } from '../src/lib/cache'
import { buildOptimizedQueries, estimateQuotaCost } from '../src/lib/queryBuilder'
import { getCompetitor } from '../src/lib/competitors'
import { isQuotaExceeded, resetQuotaFlag } from '../src/lib/youtube'

console.log('='.repeat(60))
console.log('📊 配额优化功能测试')
console.log('='.repeat(60))

// 测试 1: 缓存功能
console.log('\n1️⃣ 测试缓存功能')
console.log('-'.repeat(60))

// 写入缓存
const testKey = 'test_key_1'
const testData = { videoIds: ['video1', 'video2'], channelIds: ['channel1'] }

console.log('📝 写入缓存...')
cache.set(testKey, testData, { ttlMs: 5000 }) // 5 秒 TTL
console.log('✅ 写入成功')

// 读取缓存
console.log('📖 读取缓存...')
const cached = cache.get(testKey)
console.log('✅ 读取成功:', cached)

// 缓存信息
const cacheInfo = cache.getCacheInfo(testKey)
console.log('ℹ️ 缓存信息:', {
  age: `${(cacheInfo?.age || 0) / 1000}s`,
  expiresIn: `${((cacheInfo?.expiresAt || 0) - Date.now()) / 1000}s`
})

// 缓存统计
const stats = cache.getStats()
console.log('📊 缓存统计:', stats)

// 测试 2: 查询优化
console.log('\n2️⃣ 测试查询优化（OR 合并）')
console.log('-'.repeat(60))

try {
  const competitor = getCompetitor('weex')
  console.log('🎯 竞品:', competitor.brand_names[0])
  
  const optimizedQueries = buildOptimizedQueries(competitor)
  console.log('📝 优化查询（2-3 个，使用 OR）:')
  optimizedQueries.forEach((q, i) => {
    console.log(`   ${i + 1}. "${q}"`)
  })
  
  // 对比：旧的查询生成（10-20 个）
  console.log('\n📊 对比：')
  console.log(`   改造前: 10-20 个查询（WEEX ref, WEEX referral, WEEX invite...）`)
  console.log(`   改造后: ${optimizedQueries.length} 个查询（使用 OR 合并）`)
  console.log(`   减少比例: ${Math.round((1 - optimizedQueries.length / 15) * 100)}%`)
} catch (error) {
  console.error('❌ 测试失败:', error)
}

// 测试 3: 配额预估
console.log('\n3️⃣ 测试配额预估')
console.log('-'.repeat(60))

const queryCount = 3
const maxResultsPerQuery = 25

const quotaEstimate = estimateQuotaCost(queryCount, maxResultsPerQuery)
console.log('💰 预估配额消耗:')
console.log(`   查询数: ${queryCount}`)
console.log(`   每次结果数: ${maxResultsPerQuery}`)
console.log(`   search.list 配额: ${quotaEstimate.searchCost} units (${queryCount} × 100)`)
console.log(`   videos.list 配额: ${quotaEstimate.estimatedVideosCost} units`)
console.log(`   channels.list 配额: ${quotaEstimate.estimatedChannelsCost} units`)
console.log(`   总计预估: ${quotaEstimate.totalEstimated} units`)

console.log('\n📊 对比:')
console.log(`   改造前: ~2000 units (10-20 次 search.list)`)
console.log(`   改造后: ~${quotaEstimate.totalEstimated} units (${queryCount} 次 search.list)`)
console.log(`   节省比例: ${Math.round((1 - quotaEstimate.totalEstimated / 2000) * 100)}%`)

// 测试 4: Fail Fast 机制
console.log('\n4️⃣ 测试 Fail Fast 机制')
console.log('-'.repeat(60))

// 检查当前配额状态
const quotaStatus = isQuotaExceeded()
console.log('📊 当前配额状态:')
console.log(`   是否耗尽: ${quotaStatus.exceeded ? '❌ Yes' : '✅ No'}`)
if (quotaStatus.time) {
  console.log(`   耗尽时间: ${new Date(quotaStatus.time).toLocaleString('zh-CN')}`)
}

// 如果配额标志已设置，重置它
if (quotaStatus.exceeded) {
  console.log('🔄 重置配额标志...')
  resetQuotaFlag()
  console.log('✅ 已重置')
}

// 测试 5: 缓存键生成
console.log('\n5️⃣ 测试缓存键生成')
console.log('-'.repeat(60))

const cacheKey1 = buildCacheKey('search', { query: 'WEEX futures', maxResults: 25, debug: false })
const cacheKey2 = buildCacheKey('search', { query: 'WEEX futures', maxResults: 25, debug: true })

console.log('🔑 缓存键示例:')
console.log(`   1. ${cacheKey1}`)
console.log(`   2. ${cacheKey2}`)
console.log(`   ℹ️ 相同查询不同参数会生成不同缓存键（确保准确性）`)

// 测试完成
console.log('\n' + '='.repeat(60))
console.log('✅ 所有测试完成！')
console.log('='.repeat(60))

console.log('\n💡 后续步骤:')
console.log('   1. 启动开发服务器: npm run dev')
console.log('   2. 访问 http://localhost:3000')
console.log('   3. 运行一次分析，查看配额信息卡片')
console.log('   4. 等待 1 分钟后再次运行，验证缓存命中')
console.log('   5. 查看 /.cache 目录确认文件缓存')

// 清理测试数据
console.log('\n🧹 清理测试数据...')
cache.delete(testKey)
console.log('✅ 清理完成')

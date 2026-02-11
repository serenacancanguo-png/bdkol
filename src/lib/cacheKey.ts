/**
 * 缓存 Key 规范化工具
 * 统一处理 competitor、query 的标准化和哈希
 */

import crypto from 'crypto'

/**
 * 规范化字符串（用于 competitor、query）
 * - 转小写
 * - trim 首尾空格
 * - 多个空格压缩成 1 个
 */
export function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
}

/**
 * 规范化 competitor ID
 */
export function normalizeCompetitor(competitor: string): string {
  return normalizeString(competitor)
}

/**
 * 规范化单个 query
 */
export function normalizeQuery(query: string): string {
  return normalizeString(query)
}

/**
 * 规范化 query 数组
 * - 每个 query 先规范化
 * - 然后排序
 * - 最后生成哈希
 */
export function normalizeQueryArray(queries: string[]): string {
  const normalized = queries
    .map(q => normalizeQuery(q))
    .filter(q => q.length > 0)  // 过滤空字符串
    .sort()  // 排序
  
  // 生成哈希（使用 sha256 确保唯一性）
  const combined = normalized.join('||')
  return crypto.createHash('sha256').update(combined).digest('hex').substring(0, 16)
}

/**
 * 生成 L1 缓存 key
 * 格式: competitor_queryhash
 */
export function buildL1CacheKey(competitor: string, query: string): string {
  const normCompetitor = normalizeCompetitor(competitor)
  const normQuery = normalizeQuery(query)
  
  // 使用哈希避免文件名过长
  const queryHash = crypto.createHash('md5').update(normQuery).digest('hex').substring(0, 12)
  
  return `${normCompetitor}_${queryHash}`
}

/**
 * 生成 L1 缓存 key（多个 query）
 */
export function buildL1CacheKeyForQueries(competitor: string, queries: string[]): string {
  const normCompetitor = normalizeCompetitor(competitor)
  const queryHash = normalizeQueryArray(queries)
  
  return `${normCompetitor}_${queryHash}`
}

/**
 * 生成 L2 缓存 key（channelId）
 * - 规范化（小写 + trim）
 */
export function buildL2CacheKey(channelId: string): string {
  return normalizeString(channelId)
}

/**
 * 生成 L3 缓存 key（videoId）
 * - 规范化（小写 + trim）
 */
export function buildL3CacheKey(videoId: string): string {
  return normalizeString(videoId)
}

/**
 * 验证缓存 key 格式
 */
export function isValidCacheKey(key: string): boolean {
  // 只允许字母、数字、下划线、连字符
  return /^[a-z0-9_-]+$/.test(key)
}

/**
 * 测试和调试工具
 */
export function testCacheKeyNormalization() {
  console.log('=== Cache Key Normalization Tests ===')
  
  // 测试 1: 字符串规范化
  console.log('\n1. String Normalization:')
  console.log('  "  WEEX  " ->', normalizeString('  WEEX  '))
  console.log('  "BTC   Exchange" ->', normalizeString('BTC   Exchange'))
  
  // 测试 2: Query 规范化
  console.log('\n2. Query Normalization:')
  const q1 = 'WEEX  referral'
  const q2 = 'weex referral'
  const q3 = '  weex   referral  '
  console.log(`  "${q1}" ->`, normalizeQuery(q1))
  console.log(`  "${q2}" ->`, normalizeQuery(q2))
  console.log(`  "${q3}" ->`, normalizeQuery(q3))
  console.log('  All equal:', normalizeQuery(q1) === normalizeQuery(q2) && normalizeQuery(q2) === normalizeQuery(q3))
  
  // 测试 3: Query 数组哈希
  console.log('\n3. Query Array Hash:')
  const queries1 = ['WEEX referral', 'WEEX promo']
  const queries2 = ['weex promo', 'weex referral']  // 不同顺序
  const queries3 = ['  WEEX   REFERRAL  ', '  weex  PROMO  ']  // 不同大小写和空格
  console.log('  queries1:', queries1, '->', normalizeQueryArray(queries1))
  console.log('  queries2:', queries2, '->', normalizeQueryArray(queries2))
  console.log('  queries3:', queries3, '->', normalizeQueryArray(queries3))
  console.log('  All hashes equal:', 
    normalizeQueryArray(queries1) === normalizeQueryArray(queries2) && 
    normalizeQueryArray(queries2) === normalizeQueryArray(queries3)
  )
  
  // 测试 4: L1 Cache Key
  console.log('\n4. L1 Cache Key:')
  console.log('  buildL1CacheKey("WEEX", "referral code") ->', buildL1CacheKey('WEEX', 'referral code'))
  console.log('  buildL1CacheKey("weex", "REFERRAL CODE") ->', buildL1CacheKey('weex', 'REFERRAL CODE'))
  
  // 测试 5: L2/L3 Cache Key
  console.log('\n5. L2/L3 Cache Key:')
  console.log('  buildL2CacheKey("UCxxxYYY") ->', buildL2CacheKey('UCxxxYYY'))
  console.log('  buildL3CacheKey("dQw4w9WgXcQ") ->', buildL3CacheKey('dQw4w9WgXcQ'))
  
  console.log('\n=== Tests Complete ===\n')
}

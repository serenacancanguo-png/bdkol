/**
 * 测试缓存 Key 规范化
 */

import { 
  normalizeString, 
  normalizeCompetitor, 
  normalizeQuery,
  normalizeQueryArray,
  buildL1CacheKey,
  buildL2CacheKey,
  buildL3CacheKey,
  testCacheKeyNormalization
} from '../src/lib/cacheKey'

console.log('=== Cache Key Normalization Test ===\n')

// 运行内置测试
testCacheKeyNormalization()

// 额外测试：实际使用场景
console.log('=== Real-world Scenarios ===\n')

// 场景 1：不同大小写和空格的查询应该产生相同的 key
const scenarios = [
  { competitor: 'WEEX', query: 'WEEX referral' },
  { competitor: 'weex', query: 'weex referral' },
  { competitor: '  WEEX  ', query: '  weex   referral  ' },
  { competitor: 'WeEx', query: 'WeeX ReFeRRaL' },
]

console.log('1. Same Query with Different Cases/Spaces:')
const keys = scenarios.map(s => {
  const key = buildL1CacheKey(s.competitor, s.query)
  console.log(`  competitor="${s.competitor}", query="${s.query}" -> ${key}`)
  return key
})

const allSame = keys.every(k => k === keys[0])
console.log(`  ✅ All keys identical: ${allSame}\n`)

// 场景 2：Query 数组排序
console.log('2. Query Array Sorting:')
const queryArrays = [
  ['WEEX referral', 'WEEX promo', 'WEEX code'],
  ['weex code', 'WEEX referral', 'weex promo'],  // 不同顺序
  ['  WEEX   PROMO  ', '  weex CODE  ', 'WEEX    referral'],  // 不同顺序 + 空格
]

queryArrays.forEach((queries, i) => {
  const hash = normalizeQueryArray(queries)
  console.log(`  Array ${i+1}: [${queries.map(q => `"${q}"`).join(', ')}]`)
  console.log(`    -> Hash: ${hash}`)
})

const hashes = queryArrays.map(normalizeQueryArray)
const hashesMatch = hashes.every(h => h === hashes[0])
console.log(`  ✅ All hashes identical: ${hashesMatch}\n`)

// 场景 3：L2/L3 缓存 key
console.log('3. L2/L3 Cache Keys:')
console.log(`  L2: "UCxxxYYY123" -> ${buildL2CacheKey('UCxxxYYY123')}`)
console.log(`  L2: "  UCxxxYYY123  " -> ${buildL2CacheKey('  UCxxxYYY123  ')}`)
console.log(`  L2: "UCXXXYYYY123" -> ${buildL2CacheKey('UCXXXYYYY123')}`)
console.log()
console.log(`  L3: "dQw4w9WgXcQ" -> ${buildL3CacheKey('dQw4w9WgXcQ')}`)
console.log(`  L3: "  dQw4w9WgXcQ  " -> ${buildL3CacheKey('  dQw4w9WgXcQ  ')}`)
console.log(`  L3: "DQW4W9WGXCQ" -> ${buildL3CacheKey('DQW4W9WGXCQ')}`)

console.log('\n=== All Tests Complete ===')

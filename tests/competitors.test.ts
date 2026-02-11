/**
 * 竞品配置解析器测试
 * 运行: npx ts-node tests/competitors.test.ts
 */

import { getCompetitor, getCompetitorSafe, listCompetitors, getCompetitorCount, hasCompetitor } from '../src/lib/competitors'

console.log('🧪 开始测试竞品配置解析器...\n')

// 测试 1: listCompetitors()
console.log('📋 测试 1: listCompetitors()')
try {
  const competitors = listCompetitors()
  console.log(`✅ 成功获取 ${competitors.length} 个竞品`)
  competitors.forEach(comp => {
    console.log(`   - ${comp.id}: ${comp.brand_names[0]}`)
  })
  console.log()
} catch (error) {
  console.error('❌ 测试失败:', error)
  process.exit(1)
}

// 测试 2: getCompetitorCount()
console.log('📊 测试 2: getCompetitorCount()')
try {
  const count = getCompetitorCount()
  console.log(`✅ 竞品数量: ${count}`)
  if (count !== 4) {
    throw new Error(`期望 4 个竞品，实际获得 ${count} 个`)
  }
  console.log()
} catch (error) {
  console.error('❌ 测试失败:', error)
  process.exit(1)
}

// 测试 3: getCompetitor() - 有效 ID
console.log('🎯 测试 3: getCompetitor("weex")')
try {
  const weex = getCompetitor('weex')
  console.log(`✅ 成功获取 WEEX 配置`)
  console.log(`   品牌名称: ${weex.brand_names.join(', ')}`)
  console.log(`   搜索词数量: ${weex.query_terms.length}`)
  console.log(`   意图词数量: ${weex.intent_terms.length}`)
  console.log(`   联盟模式数量: ${weex.affiliate_patterns.length}`)
  console.log(`   赞助词数量: ${weex.sponsor_terms.length}`)
  console.log(`   风险词数量: ${weex.risk_terms.length}`)
  console.log()
} catch (error) {
  console.error('❌ 测试失败:', error)
  process.exit(1)
}

// 测试 4: getCompetitor() - 无效 ID（应该抛出错误）
console.log('⚠️  测试 4: getCompetitor("invalid_id") - 预期抛出错误')
try {
  getCompetitor('invalid_id')
  console.error('❌ 测试失败: 应该抛出错误但没有')
  process.exit(1)
} catch (error) {
  if (error instanceof Error) {
    console.log(`✅ 正确抛出错误: ${error.message}`)
    console.log()
  }
}

// 测试 5: getCompetitorSafe() - 无效 ID（返回 null）
console.log('🛡️  测试 5: getCompetitorSafe("invalid_id") - 预期返回 null')
try {
  const result = getCompetitorSafe('invalid_id')
  if (result === null) {
    console.log('✅ 正确返回 null')
  } else {
    console.error('❌ 测试失败: 应该返回 null')
    process.exit(1)
  }
  console.log()
} catch (error) {
  console.error('❌ 测试失败:', error)
  process.exit(1)
}

// 测试 6: hasCompetitor()
console.log('🔍 测试 6: hasCompetitor()')
try {
  const hasWeex = hasCompetitor('weex')
  const hasInvalid = hasCompetitor('invalid')
  
  if (hasWeex && !hasInvalid) {
    console.log('✅ hasCompetitor() 工作正常')
    console.log(`   hasCompetitor("weex"): ${hasWeex}`)
    console.log(`   hasCompetitor("invalid"): ${hasInvalid}`)
  } else {
    throw new Error('hasCompetitor() 返回了错误的结果')
  }
  console.log()
} catch (error) {
  console.error('❌ 测试失败:', error)
  process.exit(1)
}

// 测试 7: 验证所有竞品的完整性
console.log('✔️  测试 7: 验证所有竞品字段完整性')
try {
  const competitors = listCompetitors()
  const requiredFields = [
    'id', 'brand_names', 'query_terms', 'intent_terms',
    'affiliate_patterns', 'sponsor_terms', 'risk_terms'
  ]
  
  for (const comp of competitors) {
    for (const field of requiredFields) {
      if (!(field in comp)) {
        throw new Error(`竞品 ${comp.id} 缺少字段: ${field}`)
      }
      if (field !== 'id' && !Array.isArray((comp as any)[field])) {
        throw new Error(`竞品 ${comp.id} 的字段 ${field} 不是数组`)
      }
    }
  }
  
  console.log('✅ 所有竞品字段完整')
  console.log()
} catch (error) {
  console.error('❌ 测试失败:', error)
  process.exit(1)
}

// 测试 8: 验证特定关键词存在
console.log('🔑 测试 8: 验证关键词存在')
try {
  const weex = getCompetitor('weex')
  
  // 验证 intent_terms 包含必需的词
  const requiredIntents = ['ref', 'referral', 'invite', 'code', 'bonus']
  for (const intent of requiredIntents) {
    if (!weex.intent_terms.includes(intent)) {
      throw new Error(`WEEX 缺少必需的意图词: ${intent}`)
    }
  }
  
  // 验证 affiliate_patterns 包含必需的模式
  const requiredPatterns = ['ref=', 'invite=', 'code=', 'aff=']
  for (const pattern of requiredPatterns) {
    if (!weex.affiliate_patterns.includes(pattern)) {
      throw new Error(`WEEX 缺少必需的联盟模式: ${pattern}`)
    }
  }
  
  // 验证 risk_terms 包含风险词
  if (weex.risk_terms.length === 0) {
    throw new Error('WEEX 缺少风险词')
  }
  
  console.log('✅ 关键词验证通过')
  console.log(`   意图词: ${weex.intent_terms.slice(0, 5).join(', ')}...`)
  console.log(`   联盟模式: ${weex.affiliate_patterns.join(', ')}`)
  console.log(`   风险词数量: ${weex.risk_terms.length}`)
  console.log()
} catch (error) {
  console.error('❌ 测试失败:', error)
  process.exit(1)
}

console.log('🎉 所有测试通过！\n')
console.log('📊 测试摘要:')
console.log('   ✅ listCompetitors() - 正常')
console.log('   ✅ getCompetitorCount() - 正常')
console.log('   ✅ getCompetitor() - 有效ID - 正常')
console.log('   ✅ getCompetitor() - 无效ID - 正确抛出错误')
console.log('   ✅ getCompetitorSafe() - 无效ID - 正确返回null')
console.log('   ✅ hasCompetitor() - 正常')
console.log('   ✅ 字段完整性验证 - 正常')
console.log('   ✅ 关键词存在性验证 - 正常')

/**
 * 简单的 JavaScript 验证脚本（无需 TypeScript 编译）
 * 运行: node scripts/verify-competitors.js
 */

const yaml = require('js-yaml')
const fs = require('fs')
const path = require('path')

console.log('🔍 验证竞品配置...\n')

try {
  // 读取 YAML 文件
  const configPath = path.join(process.cwd(), 'config', 'competitors.yaml')
  const fileContents = fs.readFileSync(configPath, 'utf8')
  const config = yaml.load(fileContents)

  console.log('✅ YAML 文件解析成功\n')

  // 验证结构
  if (!config.competitors || !Array.isArray(config.competitors)) {
    throw new Error('配置文件缺少 competitors 数组')
  }

  console.log(`📊 找到 ${config.competitors.length} 个竞品:\n`)

  // 显示每个竞品的信息
  config.competitors.forEach((comp, index) => {
    console.log(`${index + 1}. ${comp.id.toUpperCase()}`)
    console.log(`   品牌名称: ${comp.brand_names.join(', ')}`)
    console.log(`   搜索词: ${comp.query_terms.length} 个`)
    console.log(`   意图词: ${comp.intent_terms.length} 个`)
    console.log(`   联盟模式: ${comp.affiliate_patterns.length} 个`)
    console.log(`   赞助词: ${comp.sponsor_terms.length} 个`)
    console.log(`   风险词: ${comp.risk_terms.length} 个`)
    console.log()
  })

  // 验证必需字段
  const requiredFields = [
    'id',
    'brand_names',
    'query_terms',
    'intent_terms',
    'affiliate_patterns',
    'sponsor_terms',
    'risk_terms',
  ]

  let allValid = true

  config.competitors.forEach(comp => {
    requiredFields.forEach(field => {
      if (!comp[field]) {
        console.error(`❌ 竞品 ${comp.id} 缺少字段: ${field}`)
        allValid = false
      }
    })
  })

  if (allValid) {
    console.log('✅ 所有竞品配置有效！')
    console.log('\n🎯 可用的竞品 ID:')
    config.competitors.forEach(comp => {
      console.log(`   - ${comp.id}`)
    })
  }

  console.log('\n✨ 验证完成！')
} catch (error) {
  console.error('❌ 验证失败:', error.message)
  process.exit(1)
}

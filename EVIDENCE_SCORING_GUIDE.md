# 证据提取和评分系统使用指南

## ✅ 已完成功能

### 1. 证据提取模块 (`/src/lib/evidence.ts`)

#### 核心函数

```typescript
extractEvidence(text: string, competitorConfig: Competitor): ExtractionResult
```

**功能：**
从文本中提取 KOL 与竞品关系的证据。

**证据类型：**
- `AFFILIATE_LINK` - 联盟链接（如 ref=, invite=, aff=）
- `PROMO_CODE` - 推广码（如 promo code, discount code）
- `SPONSORED_DISCLOSURE` - 赞助声明（如 sponsored, partnered）
- `CTA_MENTION` - 行动号召（如 sign up, click here）

**特性：**
- ✅ 使用竞品配置的 `affiliate_patterns`, `sponsor_terms`, `intent_terms`
- ✅ 自动提取包含关键词的文本片段（最多 160 字符）
- ✅ 智能去重（位置相近的证据保留置信度更高的）
- ✅ 置信度评分（0-1）

**返回：**
```typescript
{
  evidences: Evidence[]        // 证据列表
  totalMatches: number         // 证据总数
  hasStrongEvidence: boolean   // 是否有强证据
}
```

---

### 2. 评分模块 (`/src/lib/scoring.ts`)

#### 核心函数

```typescript
scoreCreator(
  evidences: Evidence[], 
  channelStats?: ChannelStats,
  competitorConfig?: Competitor
): ScoringResult
```

**功能：**
基于证据对 KOL 进行评分，确定与竞品的关系类型。

**评分维度：**
1. **证据得分（0-100）**
   - AFFILIATE_LINK: 35 分权重
   - PROMO_CODE: 30 分权重
   - SPONSORED_DISCLOSURE: 25 分权重
   - CTA_MENTION: 10 分权重

2. **频道质量得分（0-50）**
   - 订阅数：最多 30 分
   - 视频数：最多 10 分
   - 互动率：最多 10 分

3. **风险扣分（-30~0）**
   - 每个风险词扣 10 分
   - 最多扣 30 分

**关系类型：**
- `CONFIRMED_PARTNER` (90-100分) - 确认合作伙伴
- `LIKELY_PARTNER` (70-89分) - 可能合作伙伴
- `POTENTIAL_PARTNER` (50-69分) - 潜在合作伙伴
- `CASUAL_MENTION` (30-49分) - 偶然提及
- `UNRELATED` (0-29分) - 无关

**返回：**
```typescript
{
  confidenceScore: number      // 0-100 的置信度分数
  relationshipType: RelationshipType
  reasons: string[]            // 评分理由（至少 2 条）
  breakdown: {
    evidenceScore: number      // 证据得分
    channelScore: number       // 频道质量得分
    riskPenalty: number        // 风险扣分
  }
}
```

---

## 🚀 运行测试

### 完整测试套件

```bash
npm run test:evidence
```

这将运行 7 个测试用例，覆盖：
- ✅ 联盟链接检测
- ✅ 推广码检测
- ✅ 赞助声明检测
- ✅ 行动号召检测
- ✅ 多重证据检测
- ✅ 风险词扣分
- ✅ 无关内容过滤

**预期输出：**
```
🧪 证据提取和评分系统测试
============================================================

📋 测试 1: 证据提取 (extractEvidence)

1. 强证据：包含联盟链接
------------------------------------------------------------
   发现证据数: 1
   强证据: 是

   证据 1:
   类型: AFFILIATE_LINK
   匹配词: ref=
   置信度: 90%
   片段: ...Use my referral link: https://weex.com/signup?ref=CRYPTO123...

   ✅ 验证: 通过

2. 强证据：推广码
------------------------------------------------------------
   ...

📊 测试 2: 创作者评分 (scoreCreator)

1. 强证据：包含联盟链接
------------------------------------------------------------
   置信度分数: 77/100
   关系类型: 可能合作伙伴

   得分分解:
   - 证据得分: 31.5
   - 频道得分: 45.0
   - 风险扣分: -0.0

   评分理由 (4 条):
   1. 发现 1 个联盟链接（强证据）
   2. 中型频道（10万+ 订阅）
   3. 活跃创作者（500+ 视频）
   4. 综合评估：很可能存在合作关系

...

✅ 验收标准测试

1️⃣  测试：包含 "ref=" 应判定为 AFFILIATE_LINK
   结果: ✅ 通过
   匹配词: ref=
   置信度: 90%

2️⃣  测试：评分理由至少 2 条
   理由数量: 5
   结果: ✅ 通过

🎉 所有测试完成！
```

---

## 📝 使用示例

### 示例 1: 基础使用

```typescript
import { extractEvidence } from '@/src/lib/evidence'
import { scoreCreator } from '@/src/lib/scoring'
import { getCompetitor } from '@/src/lib/competitors'

// 1. 获取竞品配置
const weexConfig = getCompetitor('weex')

// 2. 提取证据
const text = `
  This video is sponsored by WEEX.
  Use my referral link: https://weex.com?ref=TRADER100
`

const extraction = extractEvidence(text, weexConfig)

console.log('证据数:', extraction.totalMatches)
console.log('强证据:', extraction.hasStrongEvidence)

// 3. 评分
const scoring = scoreCreator(extraction.evidences, null, weexConfig)

console.log('分数:', scoring.confidenceScore)
console.log('关系:', scoring.relationshipType)
console.log('理由:', scoring.reasons)
```

### 示例 2: 批量分析视频

```typescript
import { extractEvidence, extractEvidenceBatch } from '@/src/lib/evidence'
import { scoreCreatorBatch } from '@/src/lib/scoring'
import { getVideos } from '@/src/lib/youtube'
import { getCompetitor } from '@/src/lib/competitors'

async function analyzeVideos() {
  // 获取视频数据
  const videos = await getVideos(['videoId1', 'videoId2'])
  const weexConfig = getCompetitor('weex')

  // 批量提取证据
  const descriptions = videos.map(v => v.description)
  const extractions = extractEvidenceBatch(descriptions, weexConfig)

  // 批量评分
  const evidencesList = extractions.map(e => e.evidences)
  const scores = scoreCreatorBatch(evidencesList, null, weexConfig)

  // 输出结果
  videos.forEach((video, i) => {
    console.log(`\n视频: ${video.title}`)
    console.log(`证据数: ${extractions[i].totalMatches}`)
    console.log(`分数: ${scores[i].confidenceScore}/100`)
    console.log(`关系: ${scores[i].relationshipType}`)
  })
}
```

### 示例 3: 完整的 KOL 分析流程

```typescript
import { searchVideos, getVideos, getChannels } from '@/src/lib/youtube'
import { extractEvidence } from '@/src/lib/evidence'
import { scoreCreator } from '@/src/lib/scoring'
import { getCompetitor } from '@/src/lib/competitors'

async function analyzeKOL() {
  // 1. 搜索相关视频
  const videoIds = await searchVideos('WEEX futures trading', 25)
  const videos = await getVideos(videoIds)

  // 2. 获取频道信息
  const channelIds = [...new Set(videos.map(v => v.channelId))]
  const channels = await getChannels(channelIds)

  // 3. 分析每个频道
  const weexConfig = getCompetitor('weex')
  
  for (const channel of channels) {
    // 从频道简介提取证据
    const extraction = extractEvidence(channel.description || '', weexConfig)

    // 准备频道统计
    const channelStats = {
      subscriberCount: parseInt(channel.subscriberCount || '0'),
      videoCount: parseInt(channel.videoCount || '0'),
      viewCount: parseInt(channel.viewCount || '0'),
    }

    // 评分
    const scoring = scoreCreator(extraction.evidences, channelStats, weexConfig)

    // 输出高分频道
    if (scoring.confidenceScore >= 70) {
      console.log(`\n🎯 高价值 KOL 发现:`)
      console.log(`频道: ${channel.title}`)
      console.log(`分数: ${scoring.confidenceScore}/100`)
      console.log(`关系: ${scoring.relationshipType}`)
      console.log(`订阅: ${channel.subscriberCount}`)
      console.log(`\n理由:`)
      scoring.reasons.forEach(r => console.log(`  - ${r}`))
    }
  }
}
```

---

## 🔍 证据检测逻辑

### 1. 联盟链接检测

**匹配模式：** `affiliate_patterns` 配置
```
ref=, invite=, code=, aff=, referral=, promo=, bonus=
```

**检测逻辑：**
- 查找包含这些模式的 URL 或参数
- 提取完整链接作为证据
- 置信度: 85-90%

**示例：**
```
https://weex.com?ref=TRADER123  ✅ 检测到
https://weex.com/invite?code=CRYPTO  ✅ 检测到
```

### 2. 推广码检测

**匹配模式：** 推广码关键词 + 竞品名称
```
promo code, discount code, referral code, invite code, bonus code
```

**检测逻辑：**
- 关键词和竞品名称在 200 字符内
- 也检查 `intent_terms` 中的推广相关词
- 置信度: 75-85%

**示例：**
```
Use promo code WEEX2024  ✅ 检测到
WEEX referral code available  ✅ 检测到
```

### 3. 赞助声明检测

**匹配模式：** `sponsor_terms` 配置
```
sponsored, partnered, ambassador, paid promotion, collaboration
```

**检测逻辑：**
- 直接匹配赞助关键词
- 包含 "sponsored" 或 "paid" 的置信度更高
- 置信度: 80-95%

**示例：**
```
This video is sponsored by WEEX  ✅ 检测到
WEEX brand ambassador  ✅ 检测到
```

### 4. 行动号召检测

**匹配模式：** CTA 关键词 + 竞品名称
```
sign up, register, join, click here, check out, link below
```

**检测逻辑：**
- CTA 和竞品名称在 150 字符内
- 也检查 `intent_terms` 中的 CTA 相关词
- 置信度: 65-70%

**示例：**
```
Sign up for WEEX using my link  ✅ 检测到
Check out WEEX exchange below  ✅ 检测到
```

---

## 📊 评分算法

### 证据得分计算

```
证据得分 = Σ (证据类型权重 × 证据置信度)

权重:
- AFFILIATE_LINK: 35
- PROMO_CODE: 30
- SPONSORED_DISCLOSURE: 25
- CTA_MENTION: 10
```

**示例计算：**
```
证据1: AFFILIATE_LINK (置信度 0.9) → 35 × 0.9 = 31.5
证据2: PROMO_CODE (置信度 0.85) → 30 × 0.85 = 25.5
证据3: CTA_MENTION (置信度 0.7) → 10 × 0.7 = 7.0

总分 = 31.5 + 25.5 + 7.0 = 64.0
```

### 频道质量得分

```
订阅数得分 (最多 30 分):
- 100万+: 30 分
- 50万+: 25 分
- 10万+: 20 分
- 5万+: 15 分
- 1万+: 10 分

视频数得分 (最多 10 分):
- 1000+: 10 分
- 500+: 8 分
- 100+: 5 分

互动率得分 (最多 10 分):
- 5%+: 10 分
- 3%+: 7 分
- 1%+: 4 分
```

### 风险扣分

```
每个风险词扣 10 分，最多扣 30 分

风险词包括:
- guaranteed profit
- sure win
- 100% win
- signals group
- get rich quick
等
```

### 最终分数

```
最终分数 = MIN(100, MAX(0, 证据得分 + 频道得分 - 风险扣分))
```

---

## ✅ 验收标准验证

### 标准 1: 包含 "ref=" 判定为 AFFILIATE_LINK

```typescript
const text = 'Check out WEEX: https://weex.com?ref=test123'
const result = extractEvidence(text, weexConfig)

// ✅ 应该检测到 AFFILIATE_LINK
assert(result.evidences.some(e => e.type === EvidenceType.AFFILIATE_LINK))
```

### 标准 2: 输出 reasons 至少 2 条

```typescript
const scoring = scoreCreator(evidences, channelStats, weexConfig)

// ✅ 理由数量应该 >= 2
assert(scoring.reasons.length >= 2)

// 理由示例:
// 1. 发现 1 个联盟链接（强证据）
// 2. 中型频道（10万+ 订阅）
// 3. 综合评估：很可能存在合作关系
```

---

## 🎯 快速开始

```bash
# 1. 运行测试
npm run test:evidence

# 2. 在代码中使用
import { extractEvidence, scoreCreator } from '@/src/lib'
```

---

## 📦 导出的函数

### evidence.ts
- `extractEvidence(text, competitorConfig)` - 提取证据
- `extractEvidenceBatch(texts, competitorConfig)` - 批量提取

### scoring.ts
- `scoreCreator(evidences, channelStats?, competitorConfig?)` - 评分
- `scoreCreatorBatch(evidencesList, channelStatsList?, competitorConfig?)` - 批量评分
- `getRelationshipTypeLabel(type)` - 获取关系类型中文标签

---

## 🎉 功能完成清单

- [x] extractEvidence() 函数实现
- [x] 4 种证据类型支持
- [x] 使用竞品配置匹配
- [x] 片段提取（最多 160 字符）
- [x] scoreCreator() 函数实现
- [x] 置信度分数 (0-100)
- [x] 关系类型分类
- [x] 评分理由生成（至少 2 条）
- [x] 风险词扣分机制
- [x] 完整测试套件
- [x] 文档和示例

系统已完全实现并可以使用！🚀

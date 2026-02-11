# Quota Guard（配额守卫）- 完整实现文档

## 📋 功能概述

**Quota Guard** 是一个运行前配额预判和自动降级系统，确保每次分析都在配额预算内安全执行。

---

## 🛡️ 核心功能

### 1. 运行前配额预估

**计算公式**：
```
search.list 调用次数 = Q (queries) × P (pages)
预估成本 = 100 × Q × P units
```

**示例**：
- 3 个 queries × 1 page = 3 次调用 = **300 units**
- 5 个 queries × 2 pages = 10 次调用 = **1000 units**

---

### 2. 自动降级策略

**当预估成本超过 maxSearchUnitsPerRun 时**，按顺序执行：

#### 降级 1：只跑前 2 条 query
```
原始: 5 个 queries
降级: 2 个 queries
节省: 3 × 100 = 300 units
```

#### 降级 2：禁止翻页（P=1）
```
原始: P=2（两页）
降级: P=1（仅第一页）
节省: 50%
```

#### 降级 3：降低 maxResults
```
原始: maxResults=25
降级: maxResults=20
节省: 20%
```

**降级后重新预估**：
```
降级后成本 = 2 queries × 1 page × 100 = 200 units
```

---

### 3. 预算不足拦截

**如果降级后仍超预算**，返回友好提示：

```
⚠️ Quota Guard 拦截

降级后仍超预算。预计消耗 250 units，但预算只有 200 units。

建议：
1）使用离线回放模式（0 配额）
2）等待配额重置（每天 UTC 00:00 / 北京 08:00）
3）使用其他 API Key
4）切换到 ultraStrict 模式（100 units 预算）
```

---

## 📊 预设方案对比

| 预设 | maxSearchUnits | 降级后 Queries | MaxResults | Pages | 适用场景 |
|------|----------------|---------------|------------|-------|---------|
| **ultraStrict** | 100 units | 1 个 | 10 | P=1 | 配额极度紧张 |
| **strict** | 200 units | 2 个 | 15 | P=1 | 配额紧张 |
| **standard** | 300 units | 2 个 | 20 | P=1 | 日常生产 ✅ |
| **relaxed** | 500 units | 3 个 | 25 | P=2 | 配额充足 |

---

## 🎯 工作流程

```
用户点击 "Run Analysis"
    ↓
[Quota Guard] 检查配额预算
    ↓
计算预估成本: Q × P × 100
    ↓
是否超过 maxSearchUnitsPerRun？
    ├─ 否 → ✅ 直接执行（无降级）
    └─ 是 → 
         ├─ 自动降级（Queries, Pages, MaxResults）
         ├─ 重新计算成本
         │
         └─ 降级后是否仍超预算？
              ├─ 否 → ✅ 执行（已降级）
              └─ 是 → ❌ 拦截 + 提示用户
                        （离线模式/等配额重置/换 Key）
```

---

## 🗂️ 实现文件

### 新增文件（1 个）

#### **`src/lib/quotaGuard.ts`** (225 行) ⭐⭐⭐

**主要类和函数**：

```typescript
// 配额守卫类
class QuotaGuard {
  constructor(preset: QuotaGuardPreset = 'standard')
  
  // 预估配额消耗
  estimateQuota(queries, pages, maxResults): QuotaEstimate
  
  // 检查并决定是否需要降级
  checkAndDowngrade(queries, pages, maxResults): DowngradeDecision
  
  // 生成报告
  generateReport(decision): string
}

// 应用降级决策
function applyDowngrade(queries, decision): { queries, pages, maxResults }

// 快捷检查函数
function checkQuotaBeforeRun(queries, maxUnits, pages, maxResults): { canProceed, estimatedUnits, recommendation }
```

**预设配置**：
```typescript
export const QUOTA_GUARD_PRESETS = {
  ultraStrict: { maxSearchUnitsPerRun: 100 },
  strict:      { maxSearchUnitsPerRun: 200 },
  standard:    { maxSearchUnitsPerRun: 300 },  // 默认
  relaxed:     { maxSearchUnitsPerRun: 500 },
}
```

---

### 修改文件（1 个）

#### **`app/api/run-youtube/route.ts`** - 集成 Quota Guard

**新增导入**：
```typescript
import { QuotaGuard, applyDowngrade } from '@/src/lib/quotaGuard'
import { L1Cache } from '@/src/lib/cacheL3'
import { loadOfflineData, isOfflineDataAvailable } from '@/src/lib/offlineMode'
```

**插入位置**：在生成查询后、执行搜索前

**核心逻辑**：
```typescript
// 5. 生成优化查询
let queries = buildOptimizedQueries(competitor)
const totalQueriesGenerated = queries.length

// 🛡️ Quota Guard: 运行前检查配额预算
console.log(`\n🛡️ [Quota Guard] Checking budget before execution...`)
const quotaGuard = new QuotaGuard(testMode ? 'ultraStrict' : 'standard')

// 初始参数
let pagesPerQuery = 1
let maxResultsPerQuery = debugMode ? 10 : (testMode ? 15 : 20)

// 执行配额检查和降级决策
const decision = quotaGuard.checkAndDowngrade(queries, pagesPerQuery, maxResultsPerQuery)

// 输出决策报告
console.log(quotaGuard.generateReport(decision))

// 如果无法继续，返回错误
if (!decision.canProceed) {
  return NextResponse.json({
    success: false,
    error: `⚠️ Quota Guard 拦截\n\n${decision.recommendation}`,
    quotaGuard: {
      blocked: true,
      reason: decision.reason,
      originalEstimate: decision.originalEstimate,
      recommendation: decision.recommendation,
    },
  }, { status: 403 })
}

// 应用降级决策
if (decision.shouldDowngrade && decision.downgradedEstimate) {
  const downgraded = applyDowngrade(queries, decision)
  queries = downgraded.queries
  pagesPerQuery = downgraded.pagesPerQuery
  maxResultsPerQuery = downgraded.maxResultsPerQuery
  
  console.log(`[Quota Guard] ⬇️ Applied downgrade:`)
  console.log(`  Queries: ${totalQueriesGenerated} → ${queries.length}`)
  console.log(`  MaxResults: ${decision.originalEstimate.maxResultsPerQuery} → ${maxResultsPerQuery}`)
  console.log(`  Estimated Units: ${decision.originalEstimate.estimatedSearchUnits} → ${decision.downgradedEstimate.estimatedSearchUnits}`)
}

console.log(`[run-youtube] Final plan: ${queries.length} queries, ${maxResultsPerQuery} results/query`)
console.log(`[run-youtube] Estimated search units: ${queries.length * 100}\n`)
```

---

## 🧪 测试场景

### 场景 1：在预算内（无降级）

**请求**：
```bash
curl -X POST http://localhost:3000/api/run-youtube \
  -H "Content-Type: application/json" \
  -d '{
    "competitorId": "weex",
    "testMode": false
  }'
```

**预期行为**：
```
🛡️ [Quota Guard] Checking budget before execution...

📊 Quota Guard Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Original Estimate:
  • Queries: 3
  • Pages/Query: 1
  • MaxResults: 20
  • Search Calls: 3
  • Search Units: 300
  • Budget Limit: 300
  • Exceeds Budget: ✅ NO

Decision: ✅ PROCEED
Reason: Within budget
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Quota Guard] ✅ No downgrade needed, within budget
[run-youtube] Final plan: 3 queries, 20 results/query
[run-youtube] Estimated search units: 300
```

**结果**：✅ 正常执行，0 降级

---

### 场景 2：超预算（自动降级）

**模拟场景**：假设生成了 5 个 queries，预估 500 units，超过 300 units 预算

**预期行为**：
```
🛡️ [Quota Guard] Checking budget before execution...

📊 Quota Guard Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Original Estimate:
  • Queries: 5
  • Pages/Query: 1
  • MaxResults: 25
  • Search Calls: 5
  • Search Units: 500
  • Budget Limit: 300
  • Exceeds Budget: ❌ YES

⬇️ Downgraded Estimate:
  • Queries: 2
  • Pages/Query: 1
  • MaxResults: 20
  • Search Calls: 2
  • Search Units: 200
  • Exceeds Budget: ✅ NO

🔧 Downgrade Actions:
  • Reduced queries: 5 → 2
  • Disabled pagination: P=1 → P=1
  • Reduced maxResults: 25 → 20

Decision: ✅ PROCEED
Reason: Auto downgraded to fit budget (200 <= 300)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Quota Guard] ⬇️ Applied downgrade:
  Queries: 5 → 2
  MaxResults: 25 → 20
  Estimated Units: 500 → 200

[run-youtube] Final plan: 2 queries, 20 results/query
[run-youtube] Estimated search units: 200
```

**结果**：✅ 自动降级后执行

---

### 场景 3：降级后仍超预算（拦截）

**模拟场景**：ultraStrict 模式（100 units），但即使降级到 2 queries 也需要 200 units

**预期行为**：
```
🛡️ [Quota Guard] Checking budget before execution...

📊 Quota Guard Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Original Estimate:
  • Queries: 3
  • Pages/Query: 1
  • MaxResults: 20
  • Search Calls: 3
  • Search Units: 300
  • Budget Limit: 100
  • Exceeds Budget: ❌ YES

⬇️ Downgraded Estimate:
  • Queries: 1
  • Pages/Query: 1
  • MaxResults: 10
  • Search Calls: 1
  • Search Units: 100
  • Exceeds Budget: ✅ NO

Decision: ✅ PROCEED
Reason: Auto downgraded to fit budget (100 <= 100)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**如果仍然超预算（理论场景）**：
```json
{
  "success": false,
  "error": "⚠️ Quota Guard 拦截\n\n降级后仍超预算。预计消耗 200 units，但预算只有 100 units。\n\n建议：\n1）使用离线回放模式（0 配额）\n2）等待配额重置（每天 UTC 00:00 / 北京 08:00）\n3）使用其他 API Key\n4）切换到 ultraStrict 模式（100 units 预算）",
  "quotaGuard": {
    "blocked": true,
    "reason": "Exceeds budget even after downgrade",
    "originalEstimate": { "estimatedSearchUnits": 500 },
    "downgradedEstimate": { "estimatedSearchUnits": 200 },
    "recommendation": "..."
  }
}
```

**结果**：❌ 拦截执行，返回建议

---

## 📊 配额预算配置

### 预设方案详情

#### **ultraStrict** - 极省模式（100 units）
```typescript
{
  maxSearchUnitsPerRun: 100,      // 最多 100 units
  minQueriesPerCompetitor: 1,     // 降级到 1 个 query
  maxResultsPerQuery: 10,         // 每个 query 10 个结果
  allowPagination: false,         // 禁止翻页（P=1）
}
```
**适用**：配额极度紧张时

---

#### **strict** - 严格模式（200 units）
```typescript
{
  maxSearchUnitsPerRun: 200,
  minQueriesPerCompetitor: 2,     // 降级到 2 个 queries
  maxResultsPerQuery: 15,
  allowPagination: false,
}
```
**适用**：配额紧张时

---

#### **standard** - 标准模式（300 units）✅ 推荐
```typescript
{
  maxSearchUnitsPerRun: 300,
  minQueriesPerCompetitor: 2,
  maxResultsPerQuery: 20,
  allowPagination: false,
}
```
**适用**：日常生产使用

---

#### **relaxed** - 宽松模式（500 units）
```typescript
{
  maxSearchUnitsPerRun: 500,
  minQueriesPerCompetitor: 3,
  maxResultsPerQuery: 25,
  allowPagination: true,          // 允许翻页
}
```
**适用**：配额充足时

---

## 🔧 API 集成

### 请求格式

**V1 API**（自动启用 Quota Guard）：
```bash
curl -X POST http://localhost:3000/api/run-youtube \
  -H "Content-Type: application/json" \
  -d '{
    "competitorId": "weex",
    "testMode": false
  }'
```

**测试模式**（ultraStrict 预算）：
```bash
curl -X POST http://localhost:3000/api/run-youtube \
  -H "Content-Type: application/json" \
  -d '{
    "competitorId": "weex",
    "testMode": true
  }'
```

---

### 响应格式

**成功（无降级）**：
```json
{
  "success": true,
  "competitor": "weex",
  "channels": [...],
  "quotaInfo": {
    "estimatedCost": 303,
    "actualSearchCalls": 3
  },
  "debugStats": {
    "quotaInfo": {
      "estimatedCost": 303
    }
  }
}
```

**成功（已降级）**：
```json
{
  "success": true,
  "warning": "⚠️ Auto downgraded: 5 queries → 2 queries to fit budget",
  "competitor": "weex",
  "channels": [...],
  "quotaGuard": {
    "downgraded": true,
    "actions": [
      "Reduced queries: 5 → 2",
      "Reduced maxResults: 25 → 20"
    ],
    "originalUnits": 500,
    "downgradedUnits": 200
  }
}
```

**失败（拦截）**：
```json
{
  "success": false,
  "error": "⚠️ Quota Guard 拦截\n\n降级后仍超预算...",
  "quotaGuard": {
    "blocked": true,
    "reason": "Exceeds budget even after downgrade (250 > 200)",
    "recommendation": "1）使用离线回放模式（0 配额）\n2）等待配额重置..."
  }
}
```

---

## 📈 配额消耗对比

### 无 Quota Guard vs 有 Quota Guard

| 场景 | 无 Guard | 有 Guard（standard） | 节省 |
|------|---------|---------------------|------|
| **5 个 queries** | 500 units | **200 units** (降级到 2) | **60%** ✅ |
| **3 个 queries** | 300 units | **300 units** (无降级) | 0% |
| **10 个 queries** | 1000 units | **200 units** (降级到 2) | **80%** ✅ |
| **1 个 query** | 100 units | **100 units** (无降级) | 0% |

---

### 一天内多次分析

假设一天分析 4 个竞品，每个生成 5 个 queries：

**无 Guard**：
```
4 竞品 × 5 queries × 100 units = 2000 units/天
```

**有 Guard**（standard: 300 units）：
```
4 竞品 × 2 queries × 100 units = 800 units/天
```

**节省**：`2000 - 800 = 1200 units (60%)` ✅

---

## 🎯 使用建议

### 日常使用：
1. **默认使用 standard 预设**（300 units）
2. **配额紧张时切换到 strict**（200 units）
3. **配额极紧时切换到 ultraStrict**（100 units）

### 监控和调整：
1. **查看终端日志**：观察 Quota Guard 报告
2. **监控降级频率**：如果经常降级，考虑提高预算
3. **查看实际消耗**：对比预估和实际配额使用

### 配额紧急情况：
1. **使用离线回放模式**（0 配额）
2. **使用 L1 缓存**（如果有）
3. **等待配额重置**（每天 UTC 00:00）
4. **切换 API Key**

---

## 🔍 终端日志示例

### 示例 1：在预算内（无降级）

```
🛡️ [Quota Guard] Checking budget before execution...

🛡️ Quota Guard Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Original Estimate:
  • Queries: 3
  • Pages/Query: 1
  • MaxResults: 20
  • Search Calls: 3
  • Search Units: 300
  • Budget Limit: 300
  • Exceeds Budget: ✅ NO

Decision: ✅ PROCEED
Reason: Within budget
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Quota Guard] ✅ No downgrade needed, within budget
[run-youtube] Final plan: 3 queries, 20 results/query
[run-youtube] Estimated search units: 300
```

---

### 示例 2：超预算（自动降级）

```
🛡️ [Quota Guard] Checking budget before execution...

🛡️ Quota Guard Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Original Estimate:
  • Queries: 5
  • Pages/Query: 2
  • MaxResults: 25
  • Search Calls: 10
  • Search Units: 1000
  • Budget Limit: 300
  • Exceeds Budget: ❌ YES

⬇️ Downgraded Estimate:
  • Queries: 2
  • Pages/Query: 1
  • MaxResults: 20
  • Search Calls: 2
  • Search Units: 200
  • Exceeds Budget: ✅ NO

🔧 Downgrade Actions:
  • Reduced queries: 5 → 2
  • Disabled pagination: P=2 → P=1
  • Reduced maxResults: 25 → 20

Decision: ✅ PROCEED
Reason: Auto downgraded to fit budget (200 <= 300)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Quota Guard] ⬇️ Applied downgrade:
  Queries: 5 → 2
  MaxResults: 25 → 20
  Estimated Units: 1000 → 200

[run-youtube] Final plan: 2 queries, 20 results/query
[run-youtube] Estimated search units: 200
```

**结果**：✅ 自动降级，从 1000 units → 200 units（节省 80%）

---

### 示例 3：降级后仍超预算（拦截）

```
🛡️ [Quota Guard] Checking budget before execution...

🛡️ Quota Guard Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Original Estimate:
  • Queries: 5
  • Pages/Query: 2
  • MaxResults: 25
  • Search Calls: 10
  • Search Units: 1000
  • Budget Limit: 100
  • Exceeds Budget: ❌ YES

⬇️ Downgraded Estimate:
  • Queries: 1
  • Pages/Query: 1
  • MaxResults: 10
  • Search Calls: 1
  • Search Units: 100
  • Exceeds Budget: ✅ NO

🔧 Downgrade Actions:
  • Reduced queries: 5 → 1
  • Disabled pagination: P=2 → P=1
  • Reduced maxResults: 25 → 10

Decision: ✅ PROCEED
Reason: Auto downgraded to fit budget (100 <= 100)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**注意**：在 ultraStrict 模式下，即使是极限降级（1 query × 1 page × 10 results = 100 units）也能通过。

---

## 🎯 实现完成度

| 功能 | 状态 | 完成度 |
|------|------|--------|
| **运行前配额预估** | ✅ 已完成 | 100% |
| - 计算 Q×P | ✅ | 100% |
| - 预估成本 100×Q×P | ✅ | 100% |
| **自动降级策略** | ✅ 已完成 | 100% |
| - 只跑前 2 条 query | ✅ | 100% |
| - 禁止翻页（P=1） | ✅ | 100% |
| - maxResults=20 | ✅ | 100% |
| **预算不足拦截** | ✅ 已完成 | 100% |
| - 返回友好提示 | ✅ | 100% |
| - 建议离线回放 | ✅ | 100% |
| - 建议等配额重置 | ✅ | 100% |
| - 建议换 Key | ✅ | 100% |

---

## 🚀 使用流程

### 标准使用（推荐）

1. **选择竞品**：在 UI 选择 WEEX
2. **点击 Run Analysis**
3. **Quota Guard 自动检查**：
   - 预估成本 300 units
   - 在预算内，直接执行
4. **正常获得结果**

---

### 配额紧张时

1. **选择竞品**：WEEX
2. **点击 Run Analysis**
3. **Quota Guard 自动降级**：
   - 原始：5 queries = 500 units
   - 降级：2 queries = 200 units
   - 提示：⚠️ Auto downgraded
4. **获得结果**（略少但在预算内）

---

### 配额极度紧张

1. **Quota Guard 拦截**：
   ```
   ⚠️ Quota Guard 拦截
   
   降级后仍超预算。预计消耗 200 units，但预算只有 100 units。
   
   建议：
   1）使用离线回放模式（0 配额）
   2）等待配额重置（每天 UTC 00:00 / 北京 08:00）
   3）使用其他 API Key
   4）切换到 ultraStrict 模式
   ```

2. **用户选择**：
   - 选项 1：切换到离线模式（如果有数据）
   - 选项 2：等到明天
   - 选项 3：更换 API Key

---

## 📚 代码示例

### 快捷检查函数

```typescript
import { checkQuotaBeforeRun } from '@/src/lib/quotaGuard'

// 检查 5 个 queries，预算 300 units
const check = checkQuotaBeforeRun(5, 300, 1, 20)

console.log(check.canProceed)      // false（超预算）
console.log(check.estimatedUnits)  // 500
console.log(check.recommendation)  // "⚠️ Auto downgraded: 5 → 2 queries..."
```

---

### 完整使用（在 API 中）

```typescript
import { QuotaGuard, applyDowngrade } from '@/src/lib/quotaGuard'

// 1. 创建守卫
const guard = new QuotaGuard('standard')

// 2. 检查并获取降级决策
const decision = guard.checkAndDowngrade(queries, 1, 20)

// 3. 输出报告
console.log(guard.generateReport(decision))

// 4. 判断是否可以继续
if (!decision.canProceed) {
  return { 
    error: decision.recommendation,
    quotaGuard: { blocked: true }
  }
}

// 5. 应用降级
if (decision.shouldDowngrade) {
  const downgraded = applyDowngrade(queries, decision)
  queries = downgraded.queries
  maxResults = downgraded.maxResultsPerQuery
}

// 6. 继续执行...
```

---

## ✅ 验收清单

### 基本功能
- [x] 运行前计算 Q×P
- [x] 预估成本 100×Q×P
- [x] 与 maxSearchUnitsPerRun 对比
- [x] 在预算内直接通过
- [x] 超预算自动降级

### 降级策略
- [x] 只跑前 2 条 query
- [x] 禁止翻页（P=1）
- [x] maxResults=20
- [x] 重新预估成本
- [x] 检查降级后是否仍超预算

### 拦截和提示
- [x] 降级后仍超预算时拦截
- [x] 返回友好错误信息
- [x] 建议离线回放模式
- [x] 建议等配额重置
- [x] 建议换 API Key

### 日志和透明度
- [x] 输出 Quota Guard 报告
- [x] 显示原始预估
- [x] 显示降级预估
- [x] 显示降级操作列表
- [x] 显示最终决策

---

## 🎉 实现完成

**所有功能已 100% 实现！** ✅

Quota Guard 现已集成到 Run Analysis 流程中，会在每次执行前自动检查配额预算并智能降级，确保系统在配额受限时仍能稳定运行。

---

## 📚 相关文档

1. **`QUOTA_GUARD_IMPLEMENTATION.md`** (本文档) - Quota Guard 实现
2. **`PERSISTENT_CACHE_IMPLEMENTATION.md`** - 持久化缓存系统
3. **`QUOTA_EXCEEDED_ENHANCEMENTS.md`** - 配额耗尽增强
4. **`QUOTA_PROTECTION_ENHANCED.md`** - 配额保护增强

---

*Document generated on 2026-02-09*
*Quota Guard fully implemented and integrated*

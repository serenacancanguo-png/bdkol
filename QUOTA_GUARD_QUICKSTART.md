# Quota Guard 快速开始指南

## ✅ 实现完成

**Quota Guard（配额守卫）** 现已集成到 `/api/run-youtube` API 中，会在每次运行前自动检查配额预算并智能降级。

---

## 🎯 核心功能

### 1️⃣ 运行前配额预估
计算本次预计消耗：`Q (queries) × P (pages) × 100 units`

### 2️⃣ 自动降级策略
当预估成本超过预算（默认 300 units）时，自动执行：
- ✅ **降级 1**：只跑前 2 条 query（原始 3-5 条 → 2 条）
- ✅ **降级 2**：禁止翻页（P=1）
- ✅ **降级 3**：降低 maxResults（25 → 20）

### 3️⃣ 预算不足拦截
如果降级后仍超预算，返回 403 并提示：
- 使用离线回放模式（0 配额）
- 等待配额重置（每天 UTC 00:00 / 北京 08:00）
- 更换 API Key

---

## 📦 实现文件

### 新增文件
1. **`src/lib/quotaGuard.ts`** (225 行)
   - `QuotaGuard` 类
   - 4 个预设方案（ultraStrict / strict / standard / relaxed）
   - 配额预估和降级决策逻辑

### 修改文件
1. **`app/api/run-youtube/route.ts`**
   - 添加 Quota Guard 导入
   - 在查询执行前插入检查逻辑
   - 应用降级决策

2. **`app/page.tsx`**
   - 更新 `ApiResponse` 类型（添加 `quotaGuard` 字段）
   - 更新 `DebugStats` 类型（添加 `errorBreakdown`）

---

## 🚀 使用方式

### 标准使用（推荐）

只需正常使用 UI：

1. 选择竞品（如 WEEX）
2. 点击 **Run Analysis**
3. Quota Guard 自动运行
   - ✅ **在预算内**：正常执行，无降级
   - ⚠️ **超预算**：自动降级，执行
   - ❌ **降级后仍超预算**：拦截并提示用户

---

### 测试模式

测试模式使用 **ultraStrict** 预设（100 units 预算）：

```bash
# 在 UI 勾选 "Test Mode" 后点击 Run Analysis
# 或使用 API
curl -X POST http://localhost:3000/api/run-youtube \
  -H "Content-Type: application/json" \
  -d '{"competitorId": "weex", "testMode": true}'
```

---

## 📊 配额预设对比

| 预设 | 预算 | 降级后 Queries | MaxResults | 适用场景 |
|------|------|---------------|------------|---------|
| **ultraStrict** | 100 units | 1 个 | 10 | 配额极度紧张 |
| **strict** | 200 units | 2 个 | 15 | 配额紧张 |
| **standard** ⭐ | 300 units | 2 个 | 20 | 日常生产（推荐） |
| **relaxed** | 500 units | 3 个 | 25 | 配额充足 |

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

**结果**：✅ 正常执行，无降级

---

### 示例 2：超预算（自动降级）

```
🛡️ [Quota Guard] Checking budget before execution...

🛡️ Quota Guard Report
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

**结果**：✅ 自动降级后执行（节省 60% 配额）

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

Decision: ✅ PROCEED (极限降级)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**注意**：在 ultraStrict 模式（100 units）下，即使极限降级（1 query × 10 results）也能通过。

---

## ⚠️ 用户提示示例

如果降级后仍无法满足预算，用户会看到：

```json
{
  "success": false,
  "error": "⚠️ Quota Guard 拦截\n\n降级后仍超预算。预计消耗 250 units，但预算只有 200 units。\n\n建议：\n1）使用离线回放模式（0 配额）\n2）等待配额重置（每天 UTC 00:00 / 北京 08:00）\n3）使用其他 API Key\n4）切换到 ultraStrict 模式（100 units 预算）",
  "quotaGuard": {
    "blocked": true,
    "reason": "Exceeds budget even after downgrade",
    "originalEstimate": { "estimatedSearchUnits": 500 },
    "downgradedEstimate": { "estimatedSearchUnits": 250 },
    "recommendation": "..."
  }
}
```

---

## 📈 配额节省效果

### 对比：无 Guard vs 有 Guard

假设一天分析 4 个竞品，每个生成 5 个 queries：

**无 Quota Guard**：
```
4 竞品 × 5 queries × 100 units = 2000 units/天
```

**有 Quota Guard**（standard: 300 units）：
```
4 竞品 × 2 queries × 100 units = 800 units/天
```

**节省**：`2000 - 800 = 1200 units (60%)` ✅

---

## 🔧 配置和调整

### 修改默认预算

编辑 `src/lib/quotaGuard.ts`：

```typescript
export const QUOTA_GUARD_PRESETS = {
  standard: {
    maxSearchUnitsPerRun: 300,  // 修改这个值
    minQueriesPerCompetitor: 2,
    maxResultsPerQuery: 20,
    allowPagination: false,
  },
}
```

### 切换预设

在 `app/api/run-youtube/route.ts`：

```typescript
// 标准模式
const quotaGuard = new QuotaGuard('standard')

// 严格模式
const quotaGuard = new QuotaGuard('strict')

// 极省模式
const quotaGuard = new QuotaGuard('ultraStrict')
```

---

## ✅ 验收清单

- [x] 运行前计算 Q×P
- [x] 预估成本 100×Q×P
- [x] 与 maxSearchUnitsPerRun 对比
- [x] 在预算内直接通过
- [x] 超预算自动降级（Queries / Pages / MaxResults）
- [x] 降级后重新预估
- [x] 降级后仍超预算时拦截
- [x] 返回友好错误信息
- [x] 建议离线回放/等配额重置/换 Key
- [x] 输出详细 Quota Guard 报告
- [x] TypeScript 编译通过

---

## 📚 相关文档

1. **`QUOTA_GUARD_IMPLEMENTATION.md`** - 完整实现文档（225 行详细说明）
2. **`QUOTA_GUARD_QUICKSTART.md`** (本文档) - 快速开始指南
3. **`PERSISTENT_CACHE_IMPLEMENTATION.md`** - 持久化缓存系统
4. **`QUOTA_PROTECTION_ENHANCED.md`** - 配额保护增强

---

## 🎉 总结

**Quota Guard 已 100% 实现并集成！**

- ✅ 自动运行，无需手动干预
- ✅ 智能降级，最大化配额利用率
- ✅ 友好提示，清晰的用户反馈
- ✅ 详细日志，透明的决策过程
- ✅ 节省 60% 配额（平均）

只需正常使用 UI 或 API，Quota Guard 会自动保护您的配额！

---

*Document generated on 2026-02-09*
*Quota Guard fully operational*

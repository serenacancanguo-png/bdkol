# 📊 YouTube API 配额管理指南

## 当前配额优化设置

### 优化后的配额消耗（每次分析）

**标准模式**：
- 搜索查询：10 个 × 100 units = **1,000 units**
- 每个查询最多 25 个结果
- 目标收集 150 个视频
- **每天可运行 10 次**

**调试模式**：
- 搜索查询：5 个 × 100 units = **500 units**
- 每个查询最多 15 个结果
- 目标收集 30 个视频
- **每天可运行 20 次**

### 优化前 vs 优化后对比

| 项目 | 优化前 | 优化后 | 节省 |
|------|--------|--------|------|
| 搜索查询数 | 20 | 10 | 50% |
| 每查询结果数 | 50 | 25 | 50% |
| 目标视频数 | 300 | 150 | 50% |
| **每次消耗** | **2,000 units** | **1,000 units** | **50%** |
| **每天可运行** | **5 次** | **10 次** | **2倍** |

## YouTube API 配额说明

### 免费配额
- **每日配额**：10,000 units
- **重置时间**：UTC 午夜（北京时间早上 8:00）
- **无法累积**：未使用的配额不会转到次日

### API 调用成本
| 操作 | 成本 | 说明 |
|------|------|------|
| search.list | 100 units | 搜索视频（最贵）|
| videos.list | 1 unit | 获取视频详情 |
| channels.list | 1 unit | 获取频道信息 |

### 完整分析流程消耗示例

**标准模式（优化后）**：
```
10 次 search.list        = 10 × 100    = 1,000 units
150 次 videos.list       = 150 × 1     = 150 units
50 次 channels.list      = 50 × 1      = 50 units
----------------------------------------
总计                                   ≈ 1,200 units
```

**每天可完成**：10,000 ÷ 1,200 = **约 8 次完整分析**

## 配额用尽解决方案

### 方案 1：等待配额重置 ⏰
- **时间**：UTC 午夜（北京时间 08:00）
- **优点**：免费、自动
- **缺点**：需要等待

### 方案 2：申请更高配额 📝
1. 访问 [Google Cloud Console](https://console.cloud.google.com/apis/api/youtube.googleapis.com/quotas)
2. 选择你的项目
3. 找到 "Queries per day"
4. 点击 "Request quota increase"
5. 填写表单说明用途

**可申请额度**：
- 标准：50,000 - 1,000,000 units/day
- 审核时间：1-2 个工作日

### 方案 3：创建多个 API Key 🔑
如果有多个 Google 账号：
- 每个账号创建一个项目
- 每个项目有独立的 10,000 units/day
- 轮换使用不同的 API Key

**示例配置**：
```bash
# .env.local
YOUTUBE_API_KEY=your_key_1_here
YOUTUBE_API_KEY_2=your_key_2_here
YOUTUBE_API_KEY_3=your_key_3_here
```

### 方案 4：购买 Google Cloud 配额 💰
- YouTube API 可以购买额外配额
- 价格：约 $0.001 per unit
- 10,000 额外 units ≈ $10

## 配额优化最佳实践

### 1. 减少搜索查询数量
```typescript
// ❌ 不推荐：20 个查询
const queries = buildSearchQueries(competitor, 20)

// ✅ 推荐：10 个查询
const queries = buildSearchQueries(competitor, 10)
```

### 2. 降低每次搜索结果数
```typescript
// ❌ 不推荐：每个查询 50 个结果
await searchVideos(query, 50)

// ✅ 推荐：每个查询 25 个结果
await searchVideos(query, 25)
```

### 3. 使用缓存
```typescript
// 缓存搜索结果，避免重复查询
const cacheKey = `search_${query}_${maxResults}`
if (cache.has(cacheKey)) {
  return cache.get(cacheKey)
}
```

### 4. 批量处理
```typescript
// ✅ 一次处理多个 ID（最多 50 个）
await getVideos(['id1', 'id2', ..., 'id50'])  // 1 unit

// ❌ 分别处理
await getVideos(['id1'])  // 1 unit
await getVideos(['id2'])  // 1 unit
```

## 监控配额使用

### Google Cloud Console
1. 访问 [Quotas 页面](https://console.cloud.google.com/apis/api/youtube.googleapis.com/quotas)
2. 查看实时使用量
3. 设置告警（接近限制时邮件提醒）

### 本地日志监控
开发模式下，控制台会显示：
```
[YouTube API] search: { q: "WEEX partnership", ... }
[searchVideos] Stats: { rawSearchCount: 10, ... }
[run-youtube] Query "WEEX partnership": raw=10, fetched=10, total=10
```

统计每天的调用次数来估算配额使用。

## 当前配置摘要

✅ **已优化**：
- 查询数：20 → 10（节省 50%）
- 每查询结果：50 → 25（节省 50%）
- 目标视频数：300 → 150（节省 50%）
- Debug 模式：更低配额消耗

✅ **预期效果**：
- 每次分析：~1,200 units
- 每天可运行：8 次完整分析
- 配额利用率：提高 2 倍

## 紧急情况处理

如果配额立即用完且急需使用：

1. **使用 Debug Mode**：消耗更少（500 units/次）
2. **创建新项目**：5分钟内获得新的 10,000 units
3. **联系团队成员**：使用其他人的 API Key

## 下次配额重置

**当前日期**：2026年2月9日  
**下次重置**：2026年2月10日 08:00 北京时间

⏰ **剩余时间**：约 9-10 小时

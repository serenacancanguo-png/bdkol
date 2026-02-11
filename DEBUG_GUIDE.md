# 🐛 调试指南 - Channels Found 为 0 的问题定位

## 📊 新增调试功能

### 1. 调试模式开关（宽松搜索）

在前端页面勾选 **"🐛 Debug Mode (宽松搜索)"** 后：

- ✅ **取消 60 天时间限制**：搜索所有时间范围的视频
- ✅ **取消地域限制**：不限制 regionCode 和 relevanceLanguage
- ✅ **降低订阅数阈值**：从 5K 降低到 0（显示所有频道）
- ✅ **降低证据置信度**：从 60% 降低到 30%
- ✅ **减少目标视频数**：从 300 降低到 50（加快测试）

### 2. 详细统计信息

每次运行后，API 返回 `debugStats` 包含：

```typescript
{
  searchQueries: [
    {
      query: "WEEX partnership",
      rawSearchCount: 10,        // YouTube 返回的原始结果数
      fetchedVideoCount: 10,     // 成功提取的视频 ID 数
      uniqueVideoCount: 9,       // 去重后的唯一视频数
      apiError: {                // 如果有错误
        status: 403,
        code: "quotaExceeded",
        message: "The request cannot be completed..."
      }
    }
  ],
  totalVideosCollected: 120,     // 所有查询收集的视频总数
  afterTimeFilter: 85,           // 60 天时间过滤后
  afterEvidenceFilter: 12,       // 证据提取过滤后
  afterSubsFilter: 8,            // 订阅数过滤后
  channelsReturned: 8,           // 最终返回的频道数
  errors: [                      // 错误列表
    "Query 'WEEX ref' failed: 403 - quotaExceeded"
  ]
}
```

### 3. 前端错误显示

当 `Channels Found = 0` 时：

1. **自动显示调试信息**
2. 红色错误卡片显示具体错误
3. 点击 **"显示调试信息"** 按钮查看详细数据流
4. 每个查询的统计信息独立显示

### 4. 调试 API 端点

快速测试单个查询：

```bash
# 标准模式（有时间/地域限制）
curl "http://localhost:3000/api/debug/youtube?q=WEEX&maxResults=10"

# 宽松模式（无限制）
curl "http://localhost:3000/api/debug/youtube?q=WEEX&maxResults=10&debug=true"
```

返回：
```json
{
  "success": true,
  "query": "WEEX",
  "stats": {
    "totalResults": 10,
    "responseTimeMs": 523
  },
  "sampleResults": [
    {
      "videoId": "abc123",
      "channelId": "UC...",
      "channelTitle": "Crypto Trader",
      "videoTitle": "WEEX Exchange Review",
      "publishedAt": "2026-01-15T10:30:00Z",
      "description": "Check out WEEX with my link..."
    }
  ]
}
```

## 🔍 常见问题诊断

### 问题 1: `totalVideosCollected = 0`

**可能原因**：
- YouTube API Key 配额用尽 (403 quotaExceeded)
- API Key 无效或过期 (401 Unauthorized)
- 搜索关键词太具体，没有结果

**排查步骤**：
1. 查看 `debugStats.searchQueries` 中的 `apiError`
2. 检查 `.env.local` 中的 `YOUTUBE_API_KEY`
3. 访问 [Google Cloud Console](https://console.cloud.google.com/) 查看配额使用情况
4. 尝试开启 **Debug Mode** 看是否有结果

### 问题 2: `totalVideosCollected > 0` 但 `afterTimeFilter = 0`

**可能原因**：
- 所有视频都超过 60 天
- 竞品最近没有相关内容

**排查步骤**：
1. 开启 **Debug Mode** 取消时间限制
2. 查看 `debugStats` 中的时间过滤前后对比
3. 考虑调整时间窗口（修改 `aggregateChannelEvidences` 中的 60 天限制）

### 问题 3: `afterTimeFilter > 0` 但 `afterEvidenceFilter = 0`

**可能原因**：
- 视频描述中没有足够的证据（推广链接、promo code 等）
- 证据置信度阈值太高（60%）

**排查步骤**：
1. 开启 **Debug Mode** 降低置信度阈值到 30%
2. 检查 `config/competitors.yaml` 中的 `partnership_patterns` 是否准确
3. 使用调试 API 查看原始视频描述，确认是否包含预期关键词

### 问题 4: `afterEvidenceFilter > 0` 但 `afterSubsFilter = 0`

**可能原因**：
- 所有找到的频道订阅数 < 5K

**排查步骤**：
1. 开启 **Debug Mode** 取消订阅数限制
2. 查看 Quality Summary 中的 `Median Subscribers`
3. 考虑降低订阅数阈值（修改硬过滤条件）

## 🧪 测试流程

### 步骤 1: 基准测试

```bash
# 使用调试 API 测试单个关键词
curl "http://localhost:3000/api/debug/youtube?q=WEEX+futures&maxResults=5&debug=true"
```

检查：
- `totalResults` 是否 > 0？
- `sampleResults` 中的视频是否相关？

### 步骤 2: 宽松模式测试

1. 在前端勾选 **Debug Mode**
2. 选择竞品运行分析
3. 查看 Debug Statistics 卡片：
   - Pipeline Flow 数据流
   - Search Queries 每个查询的结果
   - Errors 错误列表

### 步骤 3: 逐步收紧

如果宽松模式有结果：
1. 关闭 Debug Mode
2. 运行标准分析
3. 对比 `debugStats` 找出哪个过滤器导致结果变为 0

## 📝 日志查看

开发模式下，后端会打印详细日志：

```bash
npm run dev
```

日志示例：
```
[YouTube API] search: { part: 'id', type: 'video', q: 'WEEX partnership', ... }
[YouTube API Success] search: returned 1523 bytes
[searchVideos] Query: "WEEX partnership", maxResults: 50, debug: false
[searchVideos] Stats: { query: 'WEEX partnership', rawSearchCount: 10, ... }
[run-youtube] Query "WEEX partnership": raw=10, fetched=10, total=10
[run-youtube] Total unique videos collected: 120
[run-youtube] Found 8 channels with evidence
```

## 🚀 快速定位清单

当 `Channels Found = 0` 时，按顺序检查：

1. ✅ **API 可用性**：调试端点返回结果吗？
2. ✅ **搜索结果**：`rawSearchCount` > 0？
3. ✅ **时间过滤**：`afterTimeFilter` / `totalVideosCollected` 比例？
4. ✅ **证据提取**：`afterEvidenceFilter` / `afterTimeFilter` 比例？
5. ✅ **订阅数过滤**：`afterSubsFilter` / `afterEvidenceFilter` 比例？

每个环节的损失率异常就是问题所在！

## 🔧 配置调整建议

### 降低时间窗口

编辑 `app/api/run-youtube/route.ts`:
```typescript
// 从 60 天改为 90 天
const sixtyDaysAgo = now - 90 * 24 * 60 * 60 * 1000
```

### 降低订阅数阈值

```typescript
// 从 5K 改为 1K
const subsThreshold = debugMode ? 0 : 1000
```

### 降低证据置信度

```typescript
// 从 60% 改为 40%
const channelEvidenceMap = aggregateChannelEvidences(videos, competitor, 40)
```

## 📞 需要帮助？

如果问题仍未解决，请提供：
1. Debug Mode 运行的完整 `debugStats` JSON
2. 调试 API 返回的 `sampleResults`
3. 后端控制台日志（搜索 `[run-youtube]` 和 `[YouTube API]`）

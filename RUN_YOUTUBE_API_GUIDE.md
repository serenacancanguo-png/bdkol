# Run YouTube API 使用指南

## API 端点

```
POST /api/run-youtube
```

## 功能说明

通过分析 YouTube 视频内容，发现和评估与竞品合作的创作者（KOL）。

---

## 请求格式

### 请求体

```typescript
{
  competitorId: "weex" | "bitunix" | "blofin" | "lbank",
  maxResults?: number  // 可选，默认 50
}
```

### 参数说明

- **competitorId** (必需): 竞品标识符
  - 支持值：`weex`, `bitunix`, `blofin`, `lbank`
  
- **maxResults** (可选): 返回的频道数量上限
  - 默认值：50
  - 建议范围：10-100

---

## 处理流程

### 1. 读取竞品配置
从 `competitors.yaml` 读取指定竞品的配置，包括：
- `query_terms`: 搜索关键词
- `intent_terms`: 意图关键词
- `affiliate_patterns`: 联盟链接模式
- `sponsor_terms`: 赞助关键词
- `risk_terms`: 风险词汇

### 2. 生成搜索查询（10-20 条）
```
示例查询：
- WEEX referral
- WEEX partnership
- WEEX sponsored
- WEEX promo code
...
```

**限制：** 最多 20 条查询（避免配额爆炸）

### 3. 搜索视频（目标 300+ 个）
- 每个查询返回最多 50 个视频
- 自动去重
- 目标收集至少 300 个候选视频

### 4. 获取视频详情
批量获取所有视频的详细信息：
- 标题
- 频道信息
- 发布日期
- 描述文本

### 5. 提取证据
对每个视频的描述进行证据提取：
- **证据类型：**
  - AFFILIATE_LINK（联盟链接）
  - PROMO_CODE（推广码）
  - SPONSORED_DISCLOSURE（赞助声明）
  - CTA_MENTION（行动号召）

- **置信度筛选：**
  - 只保留平均置信度 ≥ 60% 的视频

### 6. 聚合到频道维度
按频道 ID 聚合证据：
- 每个频道保留 top 2-3 条证据
- 记录视频数量
- 记录最新出现日期

### 7. 获取频道统计
批量获取频道信息：
- 订阅数
- 视频总数
- 观看总数

### 8. 频道打分和排序
基于证据和频道质量评分：
- **证据得分：** 强证据权重高
- **频道质量：** 订阅数、视频数加分
- **风险扣分：** 风险词汇扣分

---

## 响应格式

### 成功响应

```json
{
  "success": true,
  "competitor": "weex",
  "totalChannels": 25,
  "channels": [
    {
      "competitor": "weex",
      "channelId": "UCxxxxx",
      "channelTitle": "Crypto Futures Pro",
      "channelUrl": "https://youtube.com/channel/UCxxxxx",
      "confidenceScore": 85,
      "relationshipType": "LIKELY_PARTNER",
      "evidenceList": [
        {
          "type": "AFFILIATE_LINK",
          "snippet": "...Use my WEEX referral link: https://weex.com?ref=TRADER123..."
        },
        {
          "type": "PROMO_CODE",
          "snippet": "...Get 20% off with promo code WEEX2024..."
        }
      ],
      "subscriberCount": "125000",
      "videoCount": 3,
      "lastSeenDate": "2024-01-15T10:30:00Z"
    },
    ...
  ],
  "stats": {
    "queriesUsed": 15,
    "videosAnalyzed": 350,
    "channelsFound": 45,
    "channelsReturned": 25,
    "executionTimeMs": 45000
  }
}
```

### 字段说明

#### 顶层字段
- `success`: 请求是否成功
- `competitor`: 竞品 ID
- `totalChannels`: 返回的频道数量
- `channels`: 频道数组
- `stats`: 统计信息

#### 频道对象字段
- `competitor`: 竞品标识符
- `channelId`: YouTube 频道 ID
- `channelTitle`: 频道名称
- `channelUrl`: 频道 URL（可直接访问）
- `confidenceScore`: 置信度分数（0-100）
- `relationshipType`: 关系类型
  - `CONFIRMED_PARTNER` (90-100分)
  - `LIKELY_PARTNER` (70-89分)
  - `POTENTIAL_PARTNER` (50-69分)
  - `CASUAL_MENTION` (30-49分)
  - `UNRELATED` (0-29分)
- `evidenceList`: 证据列表（2-3 条）
  - `type`: 证据类型
  - `snippet`: 证据文本片段（160 字符内）
- `subscriberCount`: 订阅数（字符串）
- `videoCount`: 包含证据的视频数量
- `lastSeenDate`: 最新出现日期（ISO 8601）

#### 统计信息
- `queriesUsed`: 使用的搜索查询数
- `videosAnalyzed`: 分析的视频数
- `channelsFound`: 发现的频道数
- `channelsReturned`: 返回的频道数
- `executionTimeMs`: 执行时间（毫秒）

### 错误响应

```json
{
  "success": false,
  "error": "Missing YOUTUBE_API_KEY"
}
```

```json
{
  "success": false,
  "error": "Competitor with id \"xxx\" not found. Available IDs: weex, bitunix, blofin, lbank"
}
```

---

## cURL 示例

### 基础请求

```bash
curl -X POST http://localhost:3000/api/run-youtube \
  -H "Content-Type: application/json" \
  -d '{
    "competitorId": "weex"
  }'
```

### 指定结果数量

```bash
curl -X POST http://localhost:3000/api/run-youtube \
  -H "Content-Type: application/json" \
  -d '{
    "competitorId": "weex",
    "maxResults": 100
  }'
```

### 其他竞品

```bash
# BITUNIX
curl -X POST http://localhost:3000/api/run-youtube \
  -H "Content-Type: application/json" \
  -d '{"competitorId": "bitunix"}'

# BLOFIN
curl -X POST http://localhost:3000/api/run-youtube \
  -H "Content-Type: application/json" \
  -d '{"competitorId": "blofin"}'

# LBANK
curl -X POST http://localhost:3000/api/run-youtube \
  -H "Content-Type: application/json" \
  -d '{"competitorId": "lbank"}'
```

### 格式化输出（使用 jq）

```bash
curl -X POST http://localhost:3000/api/run-youtube \
  -H "Content-Type: application/json" \
  -d '{"competitorId": "weex"}' | jq
```

### 只查看前 5 个频道

```bash
curl -X POST http://localhost:3000/api/run-youtube \
  -H "Content-Type: application/json" \
  -d '{"competitorId": "weex"}' | jq '.channels[:5]'
```

### 查看统计信息

```bash
curl -X POST http://localhost:3000/api/run-youtube \
  -H "Content-Type: application/json" \
  -d '{"competitorId": "weex"}' | jq '.stats'
```

### 只查看高分频道（≥80分）

```bash
curl -X POST http://localhost:3000/api/run-youtube \
  -H "Content-Type: application/json" \
  -d '{"competitorId": "weex"}' | jq '.channels[] | select(.confidenceScore >= 80)'
```

---

## 约束和限制

### 1. 速率限制
- **查询数量：** 最多 20 条搜索查询
- **原因：** 避免 YouTube API 配额爆炸
- **配额消耗：**
  - 每个 search 查询：100 单位
  - 最多消耗：20 × 100 = 2,000 单位

### 2. 结果可解释性
- **必须条件：** `evidenceList` 不为空
- **证据要求：** 每个返回的频道必须有明确的证据
- **最低置信度：** 60%

### 3. 性能考虑
- **预期执行时间：** 30-60 秒
- **视频目标数量：** 300+ 个
- **最终返回数量：** top 50（可调整）

---

## 使用场景

### 1. BD 开发
发现正在推广竞品的 KOL，用于商务拓展：

```bash
curl -X POST http://localhost:3000/api/run-youtube \
  -H "Content-Type: application/json" \
  -d '{
    "competitorId": "weex",
    "maxResults": 50
  }' | jq '.channels[] | {
    channel: .channelTitle,
    score: .confidenceScore,
    subs: .subscriberCount,
    evidence: .evidenceList[0].type
  }'
```

### 2. 竞品监控
追踪竞品的合作 KOL 网络：

```bash
# 获取所有竞品的 top 10 KOL
for competitor in weex bitunix blofin lbank; do
  echo "=== $competitor ==="
  curl -X POST http://localhost:3000/api/run-youtube \
    -H "Content-Type: application/json" \
    -d "{\"competitorId\": \"$competitor\", \"maxResults\": 10}" \
    | jq -r '.channels[] | "\(.channelTitle): \(.confidenceScore)"'
done
```

### 3. 市场分析
分析不同竞品的 KOL 数量和质量：

```bash
curl -X POST http://localhost:3000/api/run-youtube \
  -H "Content-Type: application/json" \
  -d '{"competitorId": "weex"}' \
  | jq '{
      competitor: .competitor,
      totalChannels: .totalChannels,
      avgScore: ([.channels[].confidenceScore] | add / length),
      topChannel: .channels[0].channelTitle
    }'
```

---

## 错误处理

### 常见错误

#### 1. API Key 未配置
```json
{
  "success": false,
  "error": "Missing or invalid YOUTUBE_API_KEY"
}
```

**解决：** 在 `.env.local` 中配置 `YOUTUBE_API_KEY`

#### 2. 无效的竞品 ID
```json
{
  "success": false,
  "error": "Competitor with id \"xxx\" not found. Available IDs: weex, bitunix, blofin, lbank"
}
```

**解决：** 使用正确的竞品 ID

#### 3. 配额超限
```json
{
  "success": false,
  "error": "YouTube API error 403: quotaExceeded"
}
```

**解决：** 等待配额重置或减少 `maxResults`

#### 4. 无结果
```json
{
  "success": true,
  "totalChannels": 0,
  "channels": [],
  "message": "No channels with sufficient evidence found"
}
```

**原因：** 
- 搜索查询没有找到相关视频
- 视频描述中没有足够的证据
- 证据置信度低于阈值

---

## 性能优化建议

### 1. 首次运行
```bash
# 使用默认值快速测试
curl -X POST http://localhost:3000/api/run-youtube \
  -H "Content-Type: application/json" \
  -d '{"competitorId": "weex"}'
```

### 2. 获取更多结果
```bash
# 增加 maxResults 获取更多频道
curl -X POST http://localhost:3000/api/run-youtube \
  -H "Content-Type: application/json" \
  -d '{"competitorId": "weex", "maxResults": 100}'
```

### 3. 批量处理
```bash
# 创建脚本批量处理所有竞品
#!/bin/bash
for comp in weex bitunix blofin lbank; do
  curl -X POST http://localhost:3000/api/run-youtube \
    -H "Content-Type: application/json" \
    -d "{\"competitorId\": \"$comp\"}" \
    > "results_${comp}.json"
  echo "Completed: $comp"
  sleep 5  # 避免过快请求
done
```

---

## 监控和日志

API 会在服务器端输出详细日志：

```
Generated 15 search queries
Query "WEEX referral": found 48 videos, total: 48
Query "WEEX partnership": found 42 videos, total: 90
...
Total unique videos collected: 350
Fetching video details...
Retrieved 350 video details
Extracting evidence and aggregating by channel...
Found 45 channels with evidence
Fetching channel statistics...
Retrieved 45 channel statistics
Scoring and ranking channels...
Analysis complete in 45234ms
```

---

## 数据流程图

```
POST /api/run-youtube
  ↓
验证 API Key 和 competitorId
  ↓
获取竞品配置
  ↓
生成 10-20 条搜索查询
  ↓
搜索视频（目标 300+）
  ↓
获取视频详情
  ↓
提取证据（置信度 ≥ 60%）
  ↓
聚合到频道（保留 top 2-3 证据）
  ↓
获取频道统计
  ↓
评分和排序
  ↓
返回 top 50 频道
```

---

## 完整示例

### 请求
```bash
curl -X POST http://localhost:3000/api/run-youtube \
  -H "Content-Type: application/json" \
  -d '{
    "competitorId": "weex",
    "maxResults": 10
  }'
```

### 响应（简化）
```json
{
  "success": true,
  "competitor": "weex",
  "totalChannels": 10,
  "channels": [
    {
      "channelId": "UCabc123",
      "channelTitle": "Crypto Trader Pro",
      "channelUrl": "https://youtube.com/channel/UCabc123",
      "confidenceScore": 92,
      "relationshipType": "CONFIRMED_PARTNER",
      "evidenceList": [
        {
          "type": "AFFILIATE_LINK",
          "snippet": "Use my WEEX link: weex.com?ref=TRADER"
        },
        {
          "type": "SPONSORED_DISCLOSURE",
          "snippet": "This video is sponsored by WEEX"
        }
      ],
      "subscriberCount": "250000",
      "videoCount": 5,
      "lastSeenDate": "2024-01-20T15:30:00Z"
    }
  ],
  "stats": {
    "queriesUsed": 15,
    "videosAnalyzed": 320,
    "channelsFound": 42,
    "channelsReturned": 10,
    "executionTimeMs": 42500
  }
}
```

---

## 总结

- ✅ 自动发现与竞品合作的 KOL
- ✅ 基于证据的可解释性评分
- ✅ 速率限制保护配额
- ✅ 完整的错误处理
- ✅ 详细的统计信息

开始使用：`curl -X POST http://localhost:3000/api/run-youtube -H "Content-Type: application/json" -d '{"competitorId": "weex"}'`

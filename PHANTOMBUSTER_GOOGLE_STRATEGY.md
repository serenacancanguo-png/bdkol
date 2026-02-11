# Phantombuster + Google 搜索策略
## 零 search.list 配额方案

### 🎯 核心思路

**传统方案问题**：
- `search.list` 消耗 **100 units/次**
- 每天分析 4 个竞品 × 3 queries = 1200 units

**新方案优势**：
- Google 搜索（Phantombuster 免费版）：**0 YouTube 配额**
- 只用 `channels.list` / `videos.list` 验证：**1 unit/次**
- 预计每天 < 50 units（节省 **95%+**）

---

## 1️⃣ Google 搜索 Queries

### 竞品 1: WEEX

#### Query 1 - Partnership 方向
```
WEEX partnership futures trading referral
```
**强化版（推荐）**:
```
WEEX partnership futures trading referral site:youtube.com
```

#### Query 2 - Promo Code 方向
```
WEEX promo code futures exchange bonus
```
**强化版**:
```
WEEX promo code futures exchange bonus site:youtube.com
```

**预期结果**：
- 视频标题包含 "WEEX", "partnership", "referral code"
- 视频描述有推广链接
- 频道可能多次推广 WEEX

---

### 竞品 2: BITUNIX

#### Query 1 - Partnership 方向
```
BITUNIX partnership crypto futures referral
```
**强化版**:
```
BITUNIX partnership crypto futures referral site:youtube.com
```

#### Query 2 - Trading Bonus 方向
```
BITUNIX promo code trading bonus
```
**强化版**:
```
BITUNIX promo code trading bonus site:youtube.com
```

---

### 竞品 3: BLOFIN

#### Query 1 - Partnership 方向
```
BLOFIN partnership futures trading
```
**强化版**:
```
BLOFIN partnership futures trading site:youtube.com
```

#### Query 2 - Referral Code 方向
```
BLOFIN referral code crypto exchange
```
**强化版**:
```
BLOFIN referral code crypto exchange site:youtube.com
```

---

### 竞品 4: LBANK

#### Query 1 - Partnership 方向
```
LBANK partnership futures trading
```
**强化版**:
```
LBANK partnership futures trading site:youtube.com
```

#### Query 2 - Crypto Referral 方向
```
LBANK promo code crypto referral
```
**强化版**:
```
LBANK promo code crypto referral site:youtube.com
```

---

## 2️⃣ 从 Google Sheet 提取 YouTube URL

### Phantombuster Google Search 输出格式

Phantombuster 的 Google Search 抓取器通常导出 CSV/JSON，包含：

```json
{
  "title": "WEEX Exchange Review | Best Crypto Futures Trading",
  "link": "https://www.youtube.com/watch?v=abc123",
  "description": "Use my referral code WEEX2024 for 20% off...",
  "position": 1
}
```

---

### 提取规则（正则表达式）

#### **匹配所有 YouTube URL**

```regex
https?://(?:www\.)?(?:youtube\.com|youtu\.be)/[^\s"'<>]+
```

#### **分类提取**

**1. Video URL (标准)**
```regex
https?://(?:www\.)?youtube\.com/watch\?v=([a-zA-Z0-9_-]{11})
```
- **提取**: `$1` = `videoId`
- **示例**: `https://www.youtube.com/watch?v=abc123XYZ` → `abc123XYZ`

**2. Video URL (短链接)**
```regex
https?://youtu\.be/([a-zA-Z0-9_-]{11})
```
- **提取**: `$1` = `videoId`
- **示例**: `https://youtu.be/abc123XYZ` → `abc123XYZ`

**3. Channel URL (标准)**
```regex
https?://(?:www\.)?youtube\.com/channel/(UC[a-zA-Z0-9_-]{22})
```
- **提取**: `$1` = `channelId`
- **示例**: `https://www.youtube.com/channel/UCxyz...` → `UCxyz...`

**4. Channel URL (Handle)**
```regex
https?://(?:www\.)?youtube\.com/@([a-zA-Z0-9_-]+)
```
- **提取**: `$1` = `handle`
- **示例**: `https://www.youtube.com/@CryptoKing` → `CryptoKing`
- **注意**: Handle 需要额外解析为 `channelId`（见下节）

**5. Channel URL (Custom/User - 旧格式)**
```regex
https?://(?:www\.)?youtube\.com/(?:c|user)/([a-zA-Z0-9_-]+)
```
- **提取**: `$1` = `customUrl` 或 `username`
- **注意**: 也需要额外解析

---

### 提取逻辑（伪代码）

```python
def extract_youtube_urls(google_results):
    """从 Google 搜索结果提取 YouTube URL"""
    urls = []
    
    for result in google_results:
        # 从 link 和 description 中提取
        text = result['link'] + ' ' + result.get('description', '')
        
        # 匹配所有 YouTube URL
        matches = re.findall(r'https?://(?:www\.)?(?:youtube\.com|youtu\.be)/[^\s"\'<>]+', text)
        
        for url in matches:
            urls.append({
                'url': url,
                'source_title': result['title'],
                'source_position': result.get('position', 0)
            })
    
    return urls
```

---

## 3️⃣ URL 转换为 ID

### A. Video URL → videoId

#### **方法 1: 正则提取（推荐）**

```typescript
function extractVideoId(url: string): string | null {
  // 匹配 youtube.com/watch?v=VIDEO_ID
  const match1 = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/)
  if (match1) return match1[1]
  
  // 匹配 youtu.be/VIDEO_ID
  const match2 = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/)
  if (match2) return match2[1]
  
  // 匹配 youtube.com/embed/VIDEO_ID
  const match3 = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/)
  if (match3) return match3[1]
  
  return null
}
```

**示例**:
```typescript
extractVideoId('https://www.youtube.com/watch?v=abc123XYZ')  // 'abc123XYZ'
extractVideoId('https://youtu.be/abc123XYZ')                 // 'abc123XYZ'
extractVideoId('https://youtube.com/embed/abc123XYZ')        // 'abc123XYZ'
```

---

### B. Channel URL → channelId

#### **情况 1: 标准 Channel ID（直接提取）**

```typescript
function extractChannelId(url: string): string | null {
  // 匹配 youtube.com/channel/UC...
  const match = url.match(/youtube\.com\/channel\/(UC[a-zA-Z0-9_-]{22})/)
  return match ? match[1] : null
}
```

**示例**:
```typescript
extractChannelId('https://youtube.com/channel/UCxyz...')  // 'UCxyz...'
```

**配额成本**: **0** (直接提取)

---

#### **情况 2: Handle (@username) - 需要 API 解析**

```typescript
async function resolveHandleToChannelId(handle: string): Promise<string | null> {
  // 调用 channels.list + forHandle
  const response = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?` +
    `part=id&forHandle=${handle}&key=${API_KEY}`
  )
  
  const data = await response.json()
  
  if (data.items && data.items.length > 0) {
    return data.items[0].id  // channelId
  }
  
  return null
}
```

**示例**:
```typescript
await resolveHandleToChannelId('CryptoKing')  // 'UCxyz...'
```

**配额成本**: **1 unit/次**

**优化**: 批量解析（见下节）

---

#### **情况 3: Custom URL / Username - 需要 API 解析**

```typescript
async function resolveCustomUrlToChannelId(customUrl: string): Promise<string | null> {
  // 调用 channels.list + forUsername
  const response = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?` +
    `part=id&forUsername=${customUrl}&key=${API_KEY}`
  )
  
  const data = await response.json()
  
  if (data.items && data.items.length > 0) {
    return data.items[0].id
  }
  
  return null
}
```

**配额成本**: **1 unit/次**

---

### C. 统一 URL 解析器

```typescript
type ParsedYouTubeUrl = {
  type: 'video' | 'channel' | 'handle' | 'customUrl'
  id: string
  needsResolution: boolean  // 是否需要 API 解析
}

function parseYouTubeUrl(url: string): ParsedYouTubeUrl | null {
  // 1. Video URL
  const videoId = extractVideoId(url)
  if (videoId) {
    return { type: 'video', id: videoId, needsResolution: false }
  }
  
  // 2. Channel URL (标准)
  const channelId = extractChannelId(url)
  if (channelId) {
    return { type: 'channel', id: channelId, needsResolution: false }
  }
  
  // 3. Handle (@username)
  const handleMatch = url.match(/youtube\.com\/@([a-zA-Z0-9_-]+)/)
  if (handleMatch) {
    return { type: 'handle', id: handleMatch[1], needsResolution: true }
  }
  
  // 4. Custom URL / User
  const customMatch = url.match(/youtube\.com\/(?:c|user)\/([a-zA-Z0-9_-]+)/)
  if (customMatch) {
    return { type: 'customUrl', id: customMatch[1], needsResolution: true }
  }
  
  return null
}
```

---

## 4️⃣ 批量调用策略

### A. 批量获取视频信息

#### **API: videos.list**

**限制**: 最多 50 个 `id` 参数  
**配额成本**: **1 unit/次**（无论多少个 ID）

```typescript
async function getVideosBatch(videoIds: string[]): Promise<YouTubeVideo[]> {
  const results: YouTubeVideo[] = []
  
  // 分批处理（每批 50 个）
  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50)
    
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?` +
      `part=snippet,statistics,contentDetails&` +
      `id=${batch.join(',')}&` +
      `key=${API_KEY}`
    )
    
    const data = await response.json()
    results.push(...data.items)
    
    console.log(`[videos.list] Batch ${Math.floor(i/50) + 1}: ${batch.length} IDs, cost: 1 unit`)
  }
  
  return results
}
```

**示例**:
```typescript
const videoIds = ['abc123', 'def456', ..., 'xyz789']  // 100 个
const videos = await getVideosBatch(videoIds)
// 配额消耗: 2 units (100 / 50 = 2 批)
```

---

### B. 批量获取频道信息

#### **API: channels.list**

**限制**: 最多 50 个 `id` 参数  
**配额成本**: **1 unit/次**

```typescript
async function getChannelsBatch(channelIds: string[]): Promise<YouTubeChannel[]> {
  const results: YouTubeChannel[] = []
  
  // 分批处理（每批 50 个）
  for (let i = 0; i < channelIds.length; i += 50) {
    const batch = channelIds.slice(i, i + 50)
    
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?` +
      `part=snippet,statistics,contentDetails&` +
      `id=${batch.join(',')}&` +
      `key=${API_KEY}`
    )
    
    const data = await response.json()
    results.push(...data.items)
    
    console.log(`[channels.list] Batch ${Math.floor(i/50) + 1}: ${batch.length} IDs, cost: 1 unit`)
  }
  
  return results
}
```

---

### C. 处理 Handle 解析（优化版）

**问题**: Handle 无法批量解析（`forHandle` 只能单个）

**策略 1: 优先过滤 Handle URL**
- 在 Google 结果中，优先提取标准 Channel URL 和 Video URL
- Handle URL 作为备选

**策略 2: 通过 Video 获取 Channel ID**
- 如果只有 Handle URL，先通过 `videos.list` 获取该频道的任意视频
- 从视频的 `snippet.channelId` 提取频道 ID
- **成本更低**（因为可以批量处理）

```typescript
async function getChannelIdFromVideo(videoId: string): Promise<string | null> {
  const response = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?` +
    `part=snippet&id=${videoId}&key=${API_KEY}`
  )
  
  const data = await response.json()
  
  if (data.items && data.items.length > 0) {
    return data.items[0].snippet.channelId
  }
  
  return null
}
```

**策略 3: 必要时单独解析 Handle**
- 如果实在无法通过其他方式获取，再用 `forHandle`
- 限制数量（如最多 10 个）

---

### D. 完整批量处理流程

```typescript
async function processPhantomscrapeResults(googleResults: any[]) {
  // 1. 提取所有 YouTube URL
  const urls = extractYouTubeUrls(googleResults)
  console.log(`[Step 1] Extracted ${urls.length} YouTube URLs`)
  
  // 2. 解析 URL 为 ID
  const parsed = urls.map(u => parseYouTubeUrl(u.url)).filter(p => p !== null)
  console.log(`[Step 2] Parsed ${parsed.length} valid IDs`)
  
  // 3. 分类去重
  const videoIds = [...new Set(parsed.filter(p => p.type === 'video').map(p => p.id))]
  const channelIds = [...new Set(parsed.filter(p => p.type === 'channel').map(p => p.id))]
  const handles = [...new Set(parsed.filter(p => p.type === 'handle').map(p => p.id))]
  
  console.log(`[Step 3] Deduplicated: ${videoIds.length} videos, ${channelIds.length} channels, ${handles.length} handles`)
  
  // 4. 批量获取视频（提取 channelId）
  let quotaUsed = 0
  const videos = await getVideosBatch(videoIds)
  quotaUsed += Math.ceil(videoIds.length / 50)
  
  const channelIdsFromVideos = [...new Set(videos.map(v => v.snippet.channelId))]
  console.log(`[Step 4] Got ${channelIdsFromVideos.length} channel IDs from videos (cost: ${quotaUsed} units)`)
  
  // 5. 合并所有 channelId（去重）
  const allChannelIds = [...new Set([...channelIds, ...channelIdsFromVideos])]
  
  // 6. 批量获取频道信息
  const channels = await getChannelsBatch(allChannelIds)
  quotaUsed += Math.ceil(allChannelIds.length / 50)
  
  console.log(`[Step 6] Got ${channels.length} channels (total cost: ${quotaUsed} units)`)
  
  // 7. 必要时解析 Handle（限制数量）
  if (handles.length > 0 && handles.length <= 10) {
    for (const handle of handles) {
      const channelId = await resolveHandleToChannelId(handle)
      if (channelId) {
        const channel = await getChannelsBatch([channelId])
        channels.push(...channel)
        quotaUsed += 1
      }
    }
    console.log(`[Step 7] Resolved ${handles.length} handles (cost: ${handles.length} units)`)
  }
  
  console.log(`\n✅ Total quota used: ${quotaUsed} units`)
  
  return { videos, channels, quotaUsed }
}
```

---

### E. 配额预估

#### **场景 1: 100 个 Google 结果**

假设提取到：
- 60 个 Video URL
- 30 个 Channel URL
- 10 个 Handle

**配额消耗**:
```
videos.list:   Math.ceil(60 / 50) = 2 units
channels.list: Math.ceil(30 / 50) = 1 unit (去重后可能更少)
handle 解析:   10 × 1 = 10 units

总计: 13 units
```

vs. **传统 search.list**: 100 units/次

**节省**: `(100 - 13) / 100 = 87%` ✅

---

#### **场景 2: 每个竞品 2 queries × 50 结果**

- 4 个竞品 × 2 queries × 50 结果 = 400 个 URL
- 假设去重后 200 个 videoId，100 个 channelId

**配额消耗**:
```
videos.list:   Math.ceil(200 / 50) = 4 units
channels.list: Math.ceil(100 / 50) = 2 units

总计: 6 units/天
```

vs. **传统方案**: 4 竞品 × 2 queries × 100 = **800 units**

**节省**: `(800 - 6) / 800 = 99.25%` ✅✅✅

---

## 5️⃣ 抽样验收方法

### A. 抽样规则

从最终的频道列表中**随机抽取 20 条**进行人工验证。

```typescript
function randomSample<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

const sample = randomSample(channels, 20)
```

---

### B. 验证标准

对每条抽样结果，检查以下 5 个维度：

| # | 维度 | 检查内容 | 权重 |
|---|------|---------|------|
| 1 | **品牌相关性** | 频道名/视频标题是否提到竞品名称 | 30% |
| 2 | **合作信号** | 描述中是否有 referral/promo code/partnership 关键词 | 25% |
| 3 | **合约交易信号** | 视频内容是否涉及 futures/perpetual/leverage 等 | 20% |
| 4 | **频道质量** | 粉丝数 >= 5k，非 long_tail | 15% |
| 5 | **活跃度** | 最近上传 <= 60 天 | 10% |

**命中标准**:
- ✅ **完全命中**: 5 个维度全部满足（得分 100%）
- ⚠️ **部分命中**: 至少满足 3 个维度（得分 >= 60%）
- ❌ **不命中**: 满足 < 3 个维度（得分 < 60%）

---

### C. 计算命中率

```typescript
type ValidationResult = {
  channelId: string
  channelTitle: string
  brandMention: boolean        // 品牌相关性
  partnershipSignal: boolean   // 合作信号
  futuresSignal: boolean       // 合约交易信号
  qualityCheck: boolean        // 频道质量
  activeCheck: boolean         // 活跃度
  hitScore: number             // 综合得分 (0-100)
}

function calculateHitRate(validations: ValidationResult[]): number {
  const fullHits = validations.filter(v => v.hitScore >= 80).length
  const partialHits = validations.filter(v => v.hitScore >= 60 && v.hitScore < 80).length
  
  // 完全命中 = 1 分，部分命中 = 0.5 分
  const totalScore = fullHits + partialHits * 0.5
  const hitRate = (totalScore / validations.length) * 100
  
  return hitRate
}
```

**示例**:
```typescript
const validations = [
  { hitScore: 100 },  // 完全命中
  { hitScore: 80 },   // 完全命中
  { hitScore: 70 },   // 部分命中
  { hitScore: 40 },   // 不命中
  // ... 共 20 条
]

const hitRate = calculateHitRate(validations)
console.log(`命中率: ${hitRate.toFixed(1)}%`)
```

---

### D. 阈值与调整建议

#### **命中率 >= 70%** ✅ 优秀

**建议**:
- ✅ 当前 query 质量高，可以继续使用
- ✅ 可以扩大抓取数量（如 100 → 200 结果）
- ✅ 可以添加更多竞品或 query 变体

---

#### **命中率 60%-70%** ⚠️ 良好

**建议**:
- ⚠️ Query 基本可用，但需要优化
- 🔧 **优化 1**: 添加更多限定词（如 "review", "sponsored", "partnership"）
- 🔧 **优化 2**: 调整 `site:youtube.com` 参数
- 🔧 **优化 3**: 增加后过滤条件（如只保留粉丝数 >= 10k）

---

#### **命中率 40%-60%** ⚠️⚠️ 需要改进

**建议**:
- ⚠️⚠️ Query 质量偏低，需要显著调整
- 🔧 **优化 1**: 更换 query 关键词组合
  - **替换**: "WEEX exchange" → "WEEX futures referral"
  - **添加**: "partnership", "sponsored", "promo code"
- 🔧 **优化 2**: 分析不命中样本，找出共性问题
  - 是否包含过多非推广内容（如新闻、教程）？
  - 是否混入其他交易所的内容？
- 🔧 **优化 3**: 添加排除词
  - 如 `-news`, `-tutorial` 排除新闻和教程类内容

---

#### **命中率 < 40%** ❌ 不可用

**建议**:
- ❌ 当前 query **不可用**，必须重新设计
- 🔄 **重新设计 query**:
  - 从用户视角思考：用户会搜什么来找推广视频？
  - 参考竞品官方合作案例
  - 分析高质量样本的共同特征
- 🔄 **切换策略**:
  - 尝试用竞品名 + "review" + "referral link"
  - 尝试用竞品名 + "bonus" + "promo"
  - 尝试直接搜索知名 KOL 名字 + 竞品名

---

### E. 抽样验收报告模板

```markdown
# 抽样验收报告 - WEEX

## 基本信息
- **竞品**: WEEX
- **Query**: "WEEX partnership futures trading referral site:youtube.com"
- **抓取时间**: 2026-02-09
- **抓取结果数**: 50
- **去重后频道数**: 32
- **抽样数量**: 20

## 抽样结果

| # | 频道名 | 粉丝数 | 品牌 | 合作 | 合约 | 质量 | 活跃 | 得分 | 结论 |
|---|--------|--------|------|------|------|------|------|------|------|
| 1 | CryptoKing | 50k | ✅ | ✅ | ✅ | ✅ | ✅ | 100 | ✅ 完全命中 |
| 2 | TraderJoe | 12k | ✅ | ✅ | ✅ | ✅ | ❌ | 80 | ✅ 完全命中 |
| 3 | FuturesGuru | 8k | ✅ | ✅ | ⚠️ | ✅ | ✅ | 70 | ⚠️ 部分命中 |
| 4 | NewsChannel | 100k | ✅ | ❌ | ❌ | ✅ | ✅ | 40 | ❌ 不命中 |
| ... | ... | ... | ... | ... | ... | ... | ... | ... | ... |

## 统计摘要
- **完全命中** (>= 80分): 12 条 (60%)
- **部分命中** (60-79分): 5 条 (25%)
- **不命中** (< 60分): 3 条 (15%)

**综合命中率**: `(12 + 5 * 0.5) / 20 = 72.5%` ✅

## 结论
✅ **优秀** - 当前 query 质量高，可以继续使用。

## 建议
1. ✅ 可以扩大抓取数量至 100 结果
2. ✅ 添加变体 query："WEEX referral code futures"
3. 🔧 对不命中样本进行分析，添加排除词（如 `-news`）

---

*报告生成时间: 2026-02-09*
```

---

## 6️⃣ Phantombuster 配置建议

### A. Google Search Phantom 配置

**推荐工具**: [Google Search Results Exporter](https://phantombuster.com/phantombuster/google-search-export)

**配置参数**:
```json
{
  "searches": [
    "WEEX partnership futures trading referral site:youtube.com",
    "WEEX promo code futures exchange bonus site:youtube.com",
    "BITUNIX partnership crypto futures referral site:youtube.com",
    "BITUNIX promo code trading bonus site:youtube.com"
  ],
  "numberOfResultsPerSearch": 50,
  "country": "us",
  "language": "en",
  "csvName": "google_youtube_kols"
}
```

**免费版限制**:
- 每月执行时间：60 分钟
- 每次执行：约 2-5 分钟（取决于结果数）
- **建议**: 每天运行 1 次（8 个 queries × 50 结果 = 400 URLs）

---

### B. 输出格式

Phantombuster 输出 CSV/JSON:

```csv
query,title,link,description,position,timestamp
"WEEX partnership...",WEEX Review | Best Crypto Exchange,https://youtube.com/watch?v=abc123,"Use my referral code...",1,2026-02-09T10:00:00Z
```

---

## 7️⃣ 完整工作流

```
[Phantombuster] Google 搜索 (8 queries × 50 结果)
    ↓ (0 配额, ~5 分钟)
[导出] Google Sheet / CSV (400 URLs)
    ↓
[本地脚本] 提取 YouTube URLs
    ↓ (正则匹配)
[本地脚本] 解析为 videoId / channelId
    ↓ (去重)
[YouTube API] videos.list (批量 50/次)
    ↓ (4 units)
[YouTube API] channels.list (批量 50/次)
    ↓ (2 units)
[本地脚本] 过滤 + 评分 + 排序
    ↓
[输出] Top 50 频道
    ↓
[抽样] 随机抽 20 条人工验证
    ↓
[计算] 命中率 → 调整 query
```

**总配额消耗**: **6 units/天** vs. 传统 **800 units/天**

**节省**: **99.25%** ✅✅✅

---

## 8️⃣ 实现建议

### 立即实现

1. ✅ **创建新的 API 路由**: `/api/run-youtube-phantombuster`
2. ✅ **实现 URL 解析器**: `src/lib/youtubeUrlParser.ts`
3. ✅ **实现批量调用**: `src/lib/youtubeBatchApi.ts`
4. ✅ **集成到现有 workflow**: 作为 V3 方案

### 未来优化

1. 🔄 **自动化 Phantombuster**: 使用 Phantombuster API 自动触发
2. 🔄 **缓存 Google 结果**: L0 Cache（7 天 TTL）
3. 🔄 **智能 query 调整**: 根据命中率自动优化
4. 🔄 **Handle 批量解析**: 探索非官方方法（如爬取）

---

## ✅ 总结

| 维度 | 传统方案 | 新方案（Phantombuster + Google） | 提升 |
|------|---------|--------------------------------|------|
| **配额消耗** | 800 units/天 | 6 units/天 | **99.25% ↓** |
| **成本** | $800/天（超额付费） | $6/天（免费额度内） | **99.25% ↓** |
| **召回率** | ~80% | ~70%（可优化） | -10% ⚠️ |
| **延迟** | 实时（5 分钟） | 延迟（Phantombuster 5min + 处理 1min） | +1min |
| **灵活性** | 受 YouTube API 限制 | 受 Google 搜索结果限制 | ✅ 更高 |

**推荐使用场景**:
- ✅ 配额紧张时（< 1000 units/天）
- ✅ 多竞品批量分析（> 4 个）
- ✅ 需要高召回率（Google 搜索更全面）

---

*Strategy Document - 2026-02-09*
*Zero search.list Quota Solution*

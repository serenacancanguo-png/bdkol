# 网页搜索发现功能 - 实现状态报告

## 📊 总体状态：**尚未实现**（0%）

您要求的"网页搜索发现 + YouTube API 补全"两段式方案**尚未实现**。

---

## 🔍 当前实现状态

### ✅ 已有的基础设施

| 组件 | 文件 | 状态 | 说明 |
|------|------|------|------|
| **批量获取 videos** | `src/lib/youtubeBatchApi.ts` | ✅ 已实现 | `getVideosBatch()` - 50个/批, 1 unit |
| **批量获取 channels** | `src/lib/youtubeBatchApi.ts` | ✅ 已实现 | `getChannelsBatch()` - 50个/批, 1 unit |
| **YouTube URL 解析** | `src/lib/youtubeUrlParser.ts` | ✅ 已实现 | 解析 videoId 和 channelId |
| **缓存系统** | `src/lib/cacheL3.ts` | ✅ 已实现 | L1/L2/L3 三层缓存 |

### ❌ 缺失的功能

| 功能 | 要求 | 状态 | 缺失内容 |
|------|------|------|---------|
| **A. 网页搜索发现** | `discoverFromWebSearch()` | ❌ 未实现 | 整个功能缺失 |
| **环境变量** | `GOOGLE_SEARCH_API_KEY` 等 | ❌ 未配置 | 无相关环境变量 |
| **Google PSE 集成** | Google Programmable Search | ❌ 未实现 | 无代码 |
| **Serper/Brave Search** | 备选方案 | ❌ 未实现 | 无代码 |
| **B. URL 解析** | 从搜索结果提取 videoId | ⚠️ 部分实现 | 有工具函数，但未集成 |
| **C. 批量补全** | videos.list 批量调用 | ⚠️ 部分实现 | 有函数，但未集成到发现流程 |
| **D. 批量获取频道** | channels.list 批量调用 | ⚠️ 部分实现 | 有函数，但未集成到发现流程 |
| **E. 渲染到 UI** | 保持现有分析维度 | ❌ 未实现 | 需要集成新数据源 |
| **F. 降级逻辑** | Web Search key 未配置时退回 | ❌ 未实现 | 无降级机制 |

---

## 📂 现有文件分析

### 1. `src/lib/youtubeBatchApi.ts` - ✅ 可直接使用

**已实现功能**:

```typescript
// ✅ 批量获取视频（50个/批，1 unit）
export async function getVideosBatch(
  videoIds: string[]
): Promise<{
  videos: YouTubeVideo[]
  quotaUsed: number
  errors: string[]
}>

// ✅ 批量获取频道（50个/批，1 unit）
export async function getChannelsBatch(
  channelIds: string[]
): Promise<{
  channels: YouTubeChannel[]
  quotaUsed: number
  errors: string[]
}>

// ✅ 批量处理（视频+频道）
export async function batchProcessYouTubeData(
  videoIds: string[],
  channelIds: string[],
  handles: string[]
): Promise<{
  channels: YouTubeChannel[]
  videos: YouTubeVideo[]
  quotaUsed: number
  stats: { /* ... */ }
  errors: string[]
}>
```

**可用于步骤 C 和 D**。

---

### 2. `src/lib/youtubeUrlParser.ts` - ✅ 可直接使用

**已实现功能**:

```typescript
// ✅ 从 URL 提取 videoId
export function extractVideoId(url: string): string | null

// ✅ 从 URL 提取 channelId
export function extractChannelId(url: string): string | null

// ✅ 从文本批量提取 YouTube URLs
export function extractYouTubeUrls(text: string): string[]

// ✅ 批量解析 URLs
export function parseYouTubeUrlsBatch(urls: string[]): {
  videos: string[]
  channels: string[]
  handles: string[]
  customUrls: string[]
  invalid: string[]
}
```

**可用于步骤 B**（从搜索结果解析 videoId）。

---

### 3. `PHANTOMBUSTER_GOOGLE_STRATEGY.md` - 📄 仅文档

这是一个策略文档，包含了：
- ✅ 4 个竞品的 Google 搜索 queries
- ✅ YouTube URL 提取规则
- ✅ 配额估算
- ✅ 抽样验收方法

**但没有实际代码实现**。

---

### 4. 当前发现方式 - ⚠️ 仍使用 `search.list`

**文件**: `src/lib/youtube.ts`

```typescript
export async function searchVideos(
  query: string,
  maxResults = 25,
  debug = false,
  useCache = true
): Promise<SearchResult> {
  // ... 调用 YouTube search.list API
  // 消耗 100 units/次
}
```

**问题**: 
- ❌ 高配额消耗（100 units/次）
- ❌ 没有网页搜索替代方案
- ❌ 没有降级逻辑

---

## 🎯 需要实现的功能清单

### A. 网页搜索发现（0 quota）- ❌ 未实现

**需要创建**: `src/lib/webSearchDiscovery.ts`

**功能**:

```typescript
/**
 * 使用网页搜索发现 YouTube 视频
 * @param competitor - 竞品名称（WEEX, BITUNIX, BLOFIN, LBANK）
 * @param region - 地区（可选）
 * @returns YouTube 视频 URLs
 * 
 * 配额成本: 0 YouTube quota
 */
export async function discoverFromWebSearch(
  competitor: string,
  region?: string
): Promise<{
  urls: string[]
  source: 'google' | 'serper' | 'brave'
  quotaUsed: number  // 0 for YouTube
}>
```

**搜索查询**:
```
site:youtube.com (WEEX OR BITUNIX OR BLOFIN OR LBANK) 
(referral OR partnership OR promo code OR invite code OR fee discount OR rebate) 
(futures OR perps OR perpetual OR leverage)
```

**过滤条件**:
- 只取 `youtube.com/watch?v=` 链接
- 排除 shorts, 播放列表
- 最多 50 个结果

---

### B. URL 解析 - ⚠️ 部分实现

**可使用现有**: `src/lib/youtubeUrlParser.ts`

**需要新增**: 集成到发现流程

```typescript
// ✅ 已有函数
const videoIds = urls
  .map(url => extractVideoId(url))
  .filter(id => id !== null)

// 去重
const uniqueVideoIds = Array.from(new Set(videoIds))

// 限制最多 50 个
const limitedVideoIds = uniqueVideoIds.slice(0, 50)
```

---

### C. 批量补全视频数据（低 quota）- ⚠️ 部分实现

**可使用现有**: `src/lib/youtubeBatchApi.ts`

**需要集成**:

```typescript
import { getVideosBatch } from '@/src/lib/youtubeBatchApi'

// 批量获取视频（50个/批，1 unit）
const { videos, quotaUsed, errors } = await getVideosBatch(limitedVideoIds)

// 提取 channelId
const channelIds = videos.map(v => v.snippet.channelId)
const uniqueChannelIds = Array.from(new Set(channelIds))
```

**配额成本**: Math.ceil(videoIds.length / 50) units
- 50 个视频 = 1 unit ✅

---

### D. 批量获取频道数据（低 quota）- ⚠️ 部分实现

**可使用现有**: `src/lib/youtubeBatchApi.ts`

**需要集成**:

```typescript
import { getChannelsBatch } from '@/src/lib/youtubeBatchApi'

// 批量获取频道（50个/批，1 unit）
const { channels, quotaUsed, errors } = await getChannelsBatch(uniqueChannelIds)
```

**配额成本**: Math.ceil(channelIds.length / 50) units
- 50 个频道 = 1 unit ✅

---

### E. 渲染到 UI + 保存缓存 - ❌ 未实现

**需要修改**: 
- `app/api/run-youtube/route.ts` - 集成新发现方式
- `app/page.tsx` - 显示数据源（Web Search vs search.list）

**需要添加**:
- 数据源标识（web_search vs youtube_search）
- 缓存到 L1/L2/L3（已有基础设施）

---

### F. 降级逻辑 - ❌ 未实现

**需要实现**:

```typescript
// 检查 Web Search API key
const webSearchKey = process.env.GOOGLE_SEARCH_API_KEY || 
                      process.env.SERPER_API_KEY || 
                      process.env.BRAVE_SEARCH_API_KEY

if (webSearchKey) {
  // ✅ 使用网页搜索（0 YouTube quota）
  const { urls } = await discoverFromWebSearch(competitor, region)
  // ... 后续批量补全
} else {
  // ⚠️ 降级到 search.list（高 quota）
  console.warn('[Fallback] Web Search key not configured, using YouTube search.list')
  
  // 强制限制
  const MAX_SEARCH_CALLS = 2  // 最多 2 次
  const results = await searchVideos(query, 25, false, true)  // 强缓存
}
```

---

## 🔑 需要的环境变量

### 方案 1: Google Programmable Search Engine (PSE) - 推荐

**.env.local**:
```bash
# Google Programmable Search Engine
GOOGLE_SEARCH_API_KEY=your_google_api_key_here
GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id_here
```

**获取方式**:
1. **API Key**: https://console.cloud.google.com/apis/credentials
   - 创建项目 → 启用 Custom Search API → 创建凭据（API Key）
2. **Search Engine ID**: https://programmablesearchengine.google.com/
   - 创建搜索引擎 → 设置搜索整个网络 → 复制 Search Engine ID

**优势**:
- ✅ 官方 Google API
- ✅ 免费额度：100 次/天
- ✅ 稳定可靠

**缺点**:
- ⚠️ 每天 100 次（可能不够）

---

### 方案 2: Serper API - 备选

**.env.local**:
```bash
# Serper API
SERPER_API_KEY=your_serper_api_key_here
```

**获取方式**: https://serper.dev/
- 注册账号 → Dashboard → API Key

**优势**:
- ✅ 更高的免费额度（2500 次/月）
- ✅ 更快的响应速度
- ✅ 更简单的 API

**缺点**:
- ⚠️ 第三方服务

---

### 方案 3: Brave Search API - 备选

**.env.local**:
```bash
# Brave Search API
BRAVE_SEARCH_API_KEY=your_brave_api_key_here
```

**获取方式**: https://brave.com/search/api/
- 注册账号 → 获取 API Key

**优势**:
- ✅ 隐私友好
- ✅ 免费额度（1000 次/月）

**缺点**:
- ⚠️ 较新的服务
- ⚠️ API 响应可能不如 Google 完整

---

## 📋 需要创建的文件

### 1. `src/lib/webSearchDiscovery.ts` - ❌ 需要创建

**功能**: 网页搜索发现层

**核心函数**:
- `discoverFromWebSearch(competitor, region)` - 主入口
- `searchWithGoogle(query)` - Google PSE 实现
- `searchWithSerper(query)` - Serper 实现（备选）
- `searchWithBrave(query)` - Brave Search 实现（备选）
- `filterYouTubeVideoUrls(results)` - 过滤视频 URLs

**依赖**:
- `src/lib/youtubeUrlParser.ts` - 解析 videoId
- 环境变量: `GOOGLE_SEARCH_API_KEY` 等

---

### 2. `src/lib/discoveryPipeline.ts` - ❌ 需要创建

**功能**: 完整的发现 + 补全流程

**核心函数**:

```typescript
export async function discoverAndEnrichChannels(
  competitor: string,
  options?: {
    useWebSearch?: boolean  // 是否使用网页搜索
    maxVideos?: number      // 最多视频数
    maxChannels?: number    // 最多频道数
  }
): Promise<{
  channels: YouTubeChannel[]
  videos: YouTubeVideo[]
  source: 'web_search' | 'youtube_search'
  quotaUsed: number
  stats: {
    videoIdsFound: number
    videosEnriched: number
    channelsFound: number
    channelsEnriched: number
    webSearchCalls: number
    youtubeApiCalls: number
  }
}>
```

**流程**:
1. 检查 Web Search API key
2. 如果有 → `discoverFromWebSearch()` → 解析 videoIds
3. 如果无 → 降级到 `searchVideos()`（限制 1-2 次）
4. 批量补全视频数据（`getVideosBatch`）
5. 提取 channelIds 去重
6. 批量获取频道数据（`getChannelsBatch`）
7. 保存到 L1/L2/L3 缓存
8. 返回结果

---

### 3. 修改现有文件

#### `app/api/run-youtube/route.ts` - ⚠️ 需要修改

**修改点**:

```typescript
import { discoverAndEnrichChannels } from '@/src/lib/discoveryPipeline'

// 替换原有的 searchVideos 调用
const { channels, videos, source, quotaUsed, stats } = 
  await discoverAndEnrichChannels(competitor, {
    useWebSearch: true,  // 优先使用网页搜索
    maxVideos: 50,
    maxChannels: 50
  })

// 更新 debugStats
debugStats.discoverySource = source  // 'web_search' or 'youtube_search'
debugStats.quotaInfo.webSearchCalls = stats.webSearchCalls
debugStats.quotaInfo.youtubeApiCalls = stats.youtubeApiCalls
```

---

#### `app/page.tsx` - ⚠️ 需要修改

**添加显示**:

```typescript
// 显示数据源
{debugStats.discoverySource === 'web_search' ? (
  <div className="badge badge-success">
    ✅ Web Search (0 YouTube quota)
  </div>
) : (
  <div className="badge badge-warning">
    ⚠️ YouTube search.list (high quota)
  </div>
)}

// 显示统计
<div>Web Search Calls: {debugStats.webSearchCalls}</div>
<div>YouTube API Calls: {debugStats.youtubeApiCalls}</div>
```

---

## 🧪 本地测试步骤（完成实现后）

### 前置条件

1. **获取 Google Search API Key**（推荐）:
   - 访问: https://console.cloud.google.com/apis/credentials
   - 创建项目 → 启用 "Custom Search API"
   - 创建 API Key

2. **创建 Programmable Search Engine**:
   - 访问: https://programmablesearchengine.google.com/
   - 点击 "Add" 创建新搜索引擎
   - "Sites to search": 选择 "Search the entire web"
   - 复制 "Search engine ID"

3. **配置环境变量**:

**.env.local**:
```bash
YOUTUBE_API_KEY=AIzaSyC-UnYiIzB6n3xR6N-V1oDKksgMUdOB3UQ
PHANTOMBUSTER_API_KEY=I59ldLQyJfJ3ZQQgMXBcAbcZbAI496A9VZR5BItZJHo

# 新增（测试时需要）
GOOGLE_SEARCH_API_KEY=your_google_api_key_here
GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id_here
```

4. **重启开发服务器**:
```bash
npm run dev
```

---

### 测试步骤 1: 验证 Web Search 集成

**单元测试**:

```bash
# 创建测试脚本
npx tsx scripts/test-web-search.ts
```

**测试脚本内容**:

```typescript
import { discoverFromWebSearch } from '../src/lib/webSearchDiscovery'

async function test() {
  console.log('Testing Web Search Discovery...\n')
  
  const result = await discoverFromWebSearch('WEEX')
  
  console.log(`Found ${result.urls.length} video URLs`)
  console.log(`Source: ${result.source}`)
  console.log(`YouTube Quota Used: ${result.quotaUsed}\n`)
  
  console.log('Sample URLs:')
  result.urls.slice(0, 5).forEach((url, i) => {
    console.log(`${i + 1}. ${url}`)
  })
}

test()
```

**预期输出**:
```
Testing Web Search Discovery...

Found 50 video URLs
Source: google
YouTube Quota Used: 0

Sample URLs:
1. https://www.youtube.com/watch?v=abc123
2. https://www.youtube.com/watch?v=def456
3. https://www.youtube.com/watch?v=ghi789
...
```

---

### 测试步骤 2: 验证完整流程

**访问应用**:

```
http://localhost:3001
```

**操作**:
1. 选择竞品 "WEEX"
2. 勾选 "Debug Mode"
3. 点击 "Run Analysis"
4. 点击 "Show Debug Info"

**预期 debugStats**:

```json
{
  "discoverySource": "web_search",  // ✅ 使用了网页搜索
  "quotaInfo": {
    "webSearchCalls": 1,            // 1 次 Google Search
    "youtubeApiCalls": 2,            // videos.list + channels.list
    "actualSearchCalls": 0,          // ✅ 0 次 search.list
    "estimatedCost": 2               // ✅ 仅 2 units
  },
  "stats": {
    "videoIdsFound": 50,
    "videosEnriched": 50,
    "channelsFound": 25,
    "channelsEnriched": 25
  }
}
```

**配额对比**:
- **旧方案** (search.list): 2 次 × 100 = **200 units**
- **新方案** (web search): 0 + 2 = **2 units** ✅
- **节省**: **99%** 🎉

---

### 测试步骤 3: 验证降级逻辑

**删除 Web Search Key**:

```bash
# .env.local 中注释掉
# GOOGLE_SEARCH_API_KEY=...
# GOOGLE_SEARCH_ENGINE_ID=...
```

**重启服务器**:
```bash
npm run dev
```

**预期行为**:
- ⚠️ Console 显示警告: `[Fallback] Web Search key not configured, using YouTube search.list`
- ✅ 仍然能够运行，但使用 search.list（限制 1-2 次）
- ✅ debugStats 显示: `discoverySource: "youtube_search"`

---

## 📊 配额对比

### 场景: 每天分析 4 个竞品

| 方案 | search.list 调用 | videos.list | channels.list | 总消耗 |
|------|-----------------|-------------|---------------|--------|
| **旧方案** | 4 × 2 × 100 = 800 | 4 × 1 = 4 | 4 × 1 = 4 | **808 units** |
| **新方案** | 0 | 4 × 1 = 4 | 4 × 1 = 4 | **8 units** ✅ |
| **节省** | - | - | - | **99%** 🎉 |

**每月对比**:
- 旧方案: 808 × 30 = **24,240 units/月**
- 新方案: 8 × 30 = **240 units/月**
- YouTube 免费额度: **10,000 units/天** → 足够使用 ✅

---

## 🎯 实现优先级

### Phase 1: 核心功能（必需）

| 任务 | 预计时间 | 优先级 |
|------|---------|--------|
| 创建 `webSearchDiscovery.ts` | 2-3 小时 | 🔴 高 |
| 集成 Google PSE | 1-2 小时 | 🔴 高 |
| 创建 `discoveryPipeline.ts` | 2-3 小时 | 🔴 高 |
| 修改 `run-youtube/route.ts` | 1-2 小时 | 🔴 高 |
| 添加降级逻辑 | 1 小时 | 🔴 高 |
| 环境变量配置 | 30 分钟 | 🔴 高 |

**总计**: 约 8-12 小时

---

### Phase 2: 备选方案（可选）

| 任务 | 预计时间 | 优先级 |
|------|---------|--------|
| 集成 Serper API | 1-2 小时 | 🟡 中 |
| 集成 Brave Search | 1-2 小时 | 🟡 中 |
| 自动切换 API | 1 小时 | 🟡 中 |

**总计**: 约 3-5 小时

---

### Phase 3: UI 增强（可选）

| 任务 | 预计时间 | 优先级 |
|------|---------|--------|
| 显示数据源标识 | 30 分钟 | 🟢 低 |
| 显示配额对比 | 30 分钟 | 🟢 低 |
| Web Search 统计 | 1 小时 | 🟢 低 |

**总计**: 约 2 小时

---

## ✅ 验收标准

实现完成后，应该满足：

### 功能性

- ✅ `discoverFromWebSearch()` 可以使用 Google PSE 搜索
- ✅ 正确解析 `youtube.com/watch?v=` URLs
- ✅ 批量调用 `videos.list` 和 `channels.list`
- ✅ 结果渲染到 UI，保持原有分析维度
- ✅ 数据保存到 L1/L2/L3 缓存
- ✅ Web Search key 未配置时降级到 `search.list`

### 配额效率

- ✅ 使用 Web Search 时，`search.list` 调用次数 = **0**
- ✅ 单次分析总配额 ≤ **10 units**（vs 旧方案 200 units）
- ✅ 节省 **95%+** 配额

### 降级健壮性

- ✅ 无 Web Search key → 自动降级到 `search.list`（限制 1-2 次）
- ✅ Web Search API 失败 → 降级到 `search.list`
- ✅ Console 显示明确的降级警告

### debugStats

- ✅ 显示 `discoverySource`: 'web_search' | 'youtube_search'
- ✅ 显示 `webSearchCalls`: 次数
- ✅ 显示 `youtubeApiCalls`: videos.list + channels.list 次数
- ✅ 显示配额节省百分比

---

## 📚 相关文档

- **`PHANTOMBUSTER_GOOGLE_STRATEGY.md`** - Google 搜索策略（已有，但仅文档）
- **`src/lib/youtubeBatchApi.ts`** - 批量 API 调用（已实现）
- **`src/lib/youtubeUrlParser.ts`** - URL 解析工具（已实现）
- **`QUOTA_PROTECTION_VERIFICATION.md`** - 配额保护验收报告（已有）

---

## 🎉 总结

### 实现状态：**0%**（尚未开始）

### 已有基础设施：

- ✅ 批量 API 调用（`youtubeBatchApi.ts`）
- ✅ URL 解析工具（`youtubeUrlParser.ts`）
- ✅ 三层缓存系统（`cacheL3.ts`）
- ✅ 配额保护机制（`quotaGuard.ts`）

### 需要新增：

- ❌ 网页搜索集成（`webSearchDiscovery.ts`）
- ❌ 完整发现流程（`discoveryPipeline.ts`）
- ❌ 环境变量配置（Google PSE keys）
- ❌ 降级逻辑
- ❌ UI 集成

### 预计实现时间：

- **Phase 1（核心）**: 8-12 小时
- **Phase 2（备选）**: 3-5 小时（可选）
- **Phase 3（UI）**: 2 小时（可选）

### 配额节省：

- **旧方案**: 200 units/次（4 竞品）
- **新方案**: 8 units/次（4 竞品）
- **节省**: **96%** 🎉

---

*状态报告 - 2026-02-10*  
*需要开始实现 ❌*

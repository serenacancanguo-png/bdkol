# YouTube Data API v3 客户端使用指南

## ✅ 已完成功能

### 核心函数

#### 1. `searchVideos(query, maxResults)`
搜索 YouTube 视频，返回视频 ID 列表。

```typescript
import { searchVideos } from '@/src/lib/youtube'

const videoIds = await searchVideos('crypto futures trading', 25)
// 返回: ['videoId1', 'videoId2', ...]
```

**参数：**
- `query`: string - 搜索关键词
- `maxResults`: number - 返回数量（默认 25，最大 50）

**返回：**
- `Promise<string[]>` - 视频 ID 数组

---

#### 2. `getVideos(videoIds)`
获取视频详细信息。

```typescript
import { getVideos } from '@/src/lib/youtube'

const videos = await getVideos(['videoId1', 'videoId2'])
// 返回: [{ videoId, title, channelId, channelTitle, publishedAt, description }, ...]
```

**参数：**
- `videoIds`: string[] - 视频 ID 数组

**返回：**
```typescript
Promise<Array<{
  videoId: string
  title: string
  channelId: string
  channelTitle: string
  publishedAt: string
  description: string
}>>
```

**特性：**
- ✅ 自动去重
- ✅ 自动分批（每批最多 50 个 ID）
- ✅ 空数组处理

---

#### 3. `getChannels(channelIds)`
获取频道详细信息。

```typescript
import { getChannels } from '@/src/lib/youtube'

const channels = await getChannels(['channelId1', 'channelId2'])
```

**参数：**
- `channelIds`: string[] - 频道 ID 数组

**返回：**
```typescript
Promise<Array<{
  channelId: string
  title: string
  customUrl?: string
  country?: string
  description?: string
  subscriberCount?: string
  videoCount?: string
  viewCount?: string
  thumbnailUrl?: string
  publishedAt?: string
}>>
```

**特性：**
- ✅ 自动去重
- ✅ 自动分批（每批最多 50 个 ID）
- ✅ 包含统计数据（订阅数、视频数、观看数）

---

## 🔧 配置要求

### 环境变量

在 `.env.local` 中配置：

```env
YOUTUBE_API_KEY=你的_YouTube_API_Key
```

**获取 API Key：**
1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建新项目或选择现有项目
3. 启用 YouTube Data API v3
4. 创建凭据（API 密钥）
5. 复制 API Key 到 `.env.local`

---

## 🚀 验证和测试

### 方法 1: JavaScript 测试脚本（推荐）

```bash
npm run test:youtube
```

这将运行完整的测试套件，包括：
- ✅ searchVideos() 测试
- ✅ getVideos() 测试
- ✅ getChannels() 测试
- ✅ 批量处理测试（50+ ID）
- ✅ 错误处理测试

**预期输出：**
```
🧪 YouTube Data API v3 客户端测试
==================================================

✅ API Key 已配置 (AIzaSyC-Un...)

📹 测试 1: searchVideos()
搜索: "crypto futures trading"

✅ 成功获取 5 个视频 ID:
   1. abc123xyz
   2. def456uvw
   ...

🎬 测试 2: getVideos()
获取 5 个视频的详细信息

✅ 成功获取 3 个视频详情:

   1. Bitcoin Futures Trading Guide
      频道: Crypto Academy
      发布: 1/15/2024

📺 测试 3: getChannels()
获取 3 个频道的详细信息

✅ 成功获取 3 个频道详情:

   1. Crypto Academy
      订阅: 125.5K
      视频: 450
      URL: @cryptoacademy

🔄 测试 4: 批量处理（50+ ID）
...

🎉 所有测试通过！
```

### 方法 2: TypeScript Demo

```bash
npm run demo:youtube
```

### 方法 3: 手动测试

创建测试文件 `test.ts`：

```typescript
import { searchVideos, getVideos, getChannels } from './src/lib/youtube'

async function test() {
  // 搜索视频
  const videoIds = await searchVideos('bitcoin futures', 5)
  console.log('视频 IDs:', videoIds)

  // 获取视频详情
  const videos = await getVideos(videoIds)
  console.log('视频详情:', videos)

  // 获取频道详情
  const channelIds = videos.map(v => v.channelId)
  const channels = await getChannels(channelIds)
  console.log('频道详情:', channels)
}

test()
```

运行：
```bash
npx ts-node test.ts
```

---

## 📊 API 配额管理

### YouTube API 配额说明

YouTube Data API v3 有每日配额限制（默认 10,000 单位/天）。

**各操作消耗：**
- `search` (searchVideos): **100 单位**
- `videos` (getVideos): **1 单位**
- `channels` (getChannels): **1 单位**

### 优化建议

1. **控制搜索次数**
   ```typescript
   // ❌ 不推荐：过多搜索
   for (let i = 0; i < 100; i++) {
     await searchVideos(queries[i], 50) // 10,000 单位！
   }

   // ✅ 推荐：合理控制
   const results = await searchVideos(query, 25) // 100 单位
   ```

2. **批量获取详情**
   ```typescript
   // ✅ 一次获取 50 个视频 = 1 单位
   const videos = await getVideos(videoIds) // 自动分批
   ```

3. **去重和缓存**
   ```typescript
   // 去重已经内置
   const uniqueIds = [...new Set(videoIds)]
   const videos = await getVideos(uniqueIds)
   ```

---

## 🛡️ 错误处理

### 常见错误

#### 1. 缺少 API Key
```
Error: Missing YOUTUBE_API_KEY
```

**解决：** 在 `.env.local` 中配置 `YOUTUBE_API_KEY`

#### 2. API Key 无效
```
Error: YouTube API error 400: Bad Request
```

**解决：** 检查 API Key 是否正确，是否启用了 YouTube Data API v3

#### 3. 配额超限
```
Error: YouTube API error 403: quotaExceeded
```

**解决：** 等待第二天配额重置，或申请增加配额

#### 4. 网络错误
```
Error: YouTube API error 500: Internal Server Error
```

**解决：** 稍后重试，或检查网络连接

### 错误处理示例

```typescript
try {
  const videos = await searchVideos('bitcoin', 25)
} catch (error) {
  if (error instanceof Error) {
    console.error('搜索失败:', error.message)
    
    if (error.message.includes('quotaExceeded')) {
      console.log('配额已用完，请明天再试')
    } else if (error.message.includes('Missing YOUTUBE_API_KEY')) {
      console.log('请配置 YouTube API Key')
    }
  }
}
```

---

## 📝 完整使用示例

### 示例 1: 搜索并获取视频详情

```typescript
import { searchVideos, getVideos } from '@/src/lib/youtube'

async function analyzeVideos() {
  // 1. 搜索视频
  const videoIds = await searchVideos('WEEX futures trading', 25)
  console.log(`找到 ${videoIds.length} 个视频`)

  // 2. 获取详情
  const videos = await getVideos(videoIds)
  
  // 3. 分析
  const channelStats = {}
  videos.forEach(video => {
    if (!channelStats[video.channelId]) {
      channelStats[video.channelId] = {
        name: video.channelTitle,
        count: 0
      }
    }
    channelStats[video.channelId].count++
  })

  console.log('频道视频数统计:', channelStats)
}
```

### 示例 2: 查找高质量频道

```typescript
import { searchVideos, getVideos, getChannels } from '@/src/lib/youtube'

async function findTopChannels() {
  // 1. 搜索
  const videoIds = await searchVideos('crypto futures', 50)
  
  // 2. 获取视频详情
  const videos = await getVideos(videoIds)
  
  // 3. 提取频道 ID
  const channelIds = [...new Set(videos.map(v => v.channelId))]
  
  // 4. 获取频道详情
  const channels = await getChannels(channelIds)
  
  // 5. 按订阅数排序
  const sorted = channels
    .filter(c => c.subscriberCount)
    .sort((a, b) => parseInt(b.subscriberCount!) - parseInt(a.subscriberCount!))
    .slice(0, 10)
  
  console.log('Top 10 频道:')
  sorted.forEach((channel, i) => {
    console.log(`${i + 1}. ${channel.title} - ${formatSubs(channel.subscriberCount!)} 订阅`)
  })
}

function formatSubs(count: string): string {
  const n = parseInt(count)
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return n.toString()
}
```

### 示例 3: 批量处理大量 ID

```typescript
async function processManyVideos() {
  // 假设有 200 个视频 ID
  const allVideoIds = [...] // 200 个 ID

  // getVideos 会自动分批（每批 50 个）
  const videos = await getVideos(allVideoIds)
  
  console.log(`处理了 ${videos.length} 个视频`)
  // 自动分成 4 批：50 + 50 + 50 + 50
}
```

---

## 🔍 类型定义

```typescript
// 视频类型
type YouTubeVideo = {
  videoId: string
  title: string
  channelId: string
  channelTitle: string
  publishedAt: string
  description: string
}

// 频道类型
type YouTubeChannel = {
  channelId: string
  title: string
  customUrl?: string
  country?: string
  description?: string
  subscriberCount?: string
  videoCount?: string
  viewCount?: string
  thumbnailUrl?: string
  publishedAt?: string
}
```

---

## ✅ 功能检查清单

- [x] searchVideos() - 搜索视频
- [x] getVideos() - 获取视频详情
- [x] getChannels() - 获取频道详情
- [x] 环境变量 YOUTUBE_API_KEY
- [x] 批量处理（最多 50 个 ID）
- [x] 自动去重
- [x] 可读的错误信息
- [x] maxResults 默认 25
- [x] TypeScript 类型定义
- [x] 测试脚本
- [x] Demo 示例
- [x] 完整文档

---

## 🎯 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 配置 API Key
echo "YOUTUBE_API_KEY=你的_API_Key" > .env.local

# 3. 运行测试
npm run test:youtube

# 4. 运行 Demo
npm run demo:youtube
```

现在你的 YouTube API 客户端已经可以使用了！🎉

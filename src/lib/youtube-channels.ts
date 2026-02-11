const API_BASE = 'https://www.googleapis.com/youtube/v3'

export type YouTubeChannel = {
  channelId: string
  channelTitle: string
  description: string
  subscriberCount: string
  videoCount: string
  viewCount: string
  thumbnailUrl: string
  customUrl?: string
  country?: string
  publishedAt: string
}

type YouTubeSearchResponse = {
  items?: Array<{
    id?: {
      channelId?: string
    }
    snippet?: {
      channelId?: string
      channelTitle?: string
      description?: string
      thumbnails?: {
        default?: { url: string }
        medium?: { url: string }
        high?: { url: string }
      }
    }
  }>
}

type YouTubeChannelsResponse = {
  items?: Array<{
    id?: string
    snippet?: {
      title?: string
      description?: string
      customUrl?: string
      publishedAt?: string
      thumbnails?: {
        default?: { url: string }
        medium?: { url: string }
        high?: { url: string }
      }
      country?: string
    }
    statistics?: {
      viewCount?: string
      subscriberCount?: string
      videoCount?: string
    }
  }>
}

function getApiKey(): string {
  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey || apiKey === 'your_youtube_api_key_here') {
    throw new Error('Missing YOUTUBE_API_KEY')
  }
  return apiKey
}

async function youtubeFetch<T>(endpoint: string, params: Record<string, string>) {
  const apiKey = getApiKey()
  const url = new URL(`${API_BASE}/${endpoint}`)
  const searchParams = new URLSearchParams({
    key: apiKey,
    ...params,
  })
  url.search = searchParams.toString()

  const response = await fetch(url.toString())
  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    throw new Error(`YouTube API error ${response.status}: ${errorText || response.statusText}`)
  }

  return (await response.json()) as T
}

/**
 * 搜索 YouTube 频道
 */
export async function searchChannels(query: string, maxResults = 25): Promise<string[]> {
  if (!query || !query.trim()) {
    return []
  }

  const data = await youtubeFetch<YouTubeSearchResponse>('search', {
    part: 'snippet',
    type: 'channel',
    q: query,
    maxResults: String(maxResults),
  })

  const items = data.items ?? []
  return items
    .map(item => item.id?.channelId || item.snippet?.channelId)
    .filter((id): id is string => Boolean(id))
}

/**
 * 获取频道详细信息
 */
export async function getChannels(channelIds: string[]): Promise<YouTubeChannel[]> {
  if (channelIds.length === 0) {
    return []
  }

  const uniqueIds = Array.from(new Set(channelIds))
  const chunks: string[][] = []
  const maxPerRequest = 50

  for (let i = 0; i < uniqueIds.length; i += maxPerRequest) {
    chunks.push(uniqueIds.slice(i, i + maxPerRequest))
  }

  const results: YouTubeChannel[] = []

  for (const chunk of chunks) {
    const data = await youtubeFetch<YouTubeChannelsResponse>('channels', {
      part: 'snippet,statistics',
      id: chunk.join(','),
    })

    const items = data.items ?? []
    for (const item of items) {
      const snippet = item.snippet
      const statistics = item.statistics
      if (!item.id || !snippet) {
        continue
      }
      results.push({
        channelId: item.id,
        channelTitle: snippet.title ?? '',
        description: snippet.description ?? '',
        subscriberCount: statistics?.subscriberCount ?? '0',
        videoCount: statistics?.videoCount ?? '0',
        viewCount: statistics?.viewCount ?? '0',
        thumbnailUrl: snippet.thumbnails?.high?.url ?? snippet.thumbnails?.medium?.url ?? '',
        customUrl: snippet.customUrl,
        country: snippet.country,
        publishedAt: snippet.publishedAt ?? '',
      })
    }
  }

  return results
}

/**
 * 根据关键词相关性评分频道（优化加密货币期货领域）
 */
export function scoreChannelRelevance(
  channel: YouTubeChannel,
  keywords: string[]
): number {
  let score = 0
  const titleLower = channel.channelTitle.toLowerCase()
  const descLower = channel.description.toLowerCase()
  const searchText = `${titleLower} ${descLower}`

  // 高权重核心词（竞品、返佣、合作）
  const highPriorityKeywords = [
    'referral', 'fee rebate', 'partnership', 'commission', 
    'revenue share', 'cashback', 'discount', 'promo code',
    'futures', 'perps', 'perpetual', 'crypto', 'bitcoin', 'ethereum'
  ]

  for (const keyword of keywords) {
    const kw = keyword.toLowerCase()
    if (searchText.includes(kw)) {
      const isHighPriority = highPriorityKeywords.some(hp => kw.includes(hp) || hp.includes(kw))
      
      // 标题匹配
      if (titleLower.includes(kw)) {
        score += isHighPriority ? 5 : 3
      } 
      // 描述匹配
      else if (descLower.includes(kw)) {
        score += isHighPriority ? 2 : 1
      }
    }
  }

  // 额外加分：订阅数高的频道（影响力大）
  const subs = parseInt(channel.subscriberCount)
  if (subs >= 100000) score += 3
  else if (subs >= 50000) score += 2
  else if (subs >= 10000) score += 1

  // 额外加分：视频数量多（活跃度高）
  const videos = parseInt(channel.videoCount)
  if (videos >= 500) score += 2
  else if (videos >= 100) score += 1

  return score
}

/**
 * 筛选高相关性频道
 */
export function filterRelevantChannels(
  channels: YouTubeChannel[],
  keywords: string[],
  minScore = 2
): YouTubeChannel[] {
  return channels
    .map(channel => ({
      channel,
      score: scoreChannelRelevance(channel, keywords),
    }))
    .filter(item => item.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .map(item => item.channel)
}

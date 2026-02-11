/**
 * YouTube Data API v3 客户端
 * 封装视频和频道搜索功能（优化版：配额保护 + 缓存）
 */

import { cache, buildCacheKey } from './cache'

const API_BASE = 'https://www.googleapis.com/youtube/v3'

/**
 * 配额耗尽标志（全局）
 * 用于 fail fast - 一旦遇到 quotaExceeded，停止所有后续请求
 */
let quotaExceededFlag = false
let quotaExceededTime = 0
let quotaExceededAtQuery = ''  // 新增：记录哪个查询触发配额耗尽
let abortController: AbortController | null = null  // 新增：中止控制器

/**
 * 重置配额标志（每天重置一次或手动重置）
 */
export function resetQuotaFlag(): void {
  quotaExceededFlag = false
  quotaExceededTime = 0
  quotaExceededAtQuery = ''
  console.log('[YouTube] Quota flag reset')
}

/**
 * 中止所有正在进行的查询
 */
export function abortAllQueries(): void {
  if (abortController) {
    abortController.abort()
    console.log('[YouTube] All queries aborted due to quota exceeded')
  }
}

/**
 * 检查是否配额已用尽
 */
export function isQuotaExceeded(): { 
  exceeded: boolean
  time?: number
  query?: string
} {
  // 自动重置：如果距离上次 quotaExceeded 超过 12 小时，重置标志
  if (quotaExceededFlag && Date.now() - quotaExceededTime > 12 * 60 * 60 * 1000) {
    resetQuotaFlag()
  }
  
  return {
    exceeded: quotaExceededFlag,
    time: quotaExceededTime || undefined,
    query: quotaExceededAtQuery || undefined,
  }
}

export type YouTubeVideo = {
  videoId: string
  title: string
  channelId: string
  channelTitle: string
  publishedAt: string
  description: string
}

export type YouTubeChannel = {
  channelId: string
  title: string
  customUrl?: string
  country?: string
  description?: string
  subscriberCount?: string
  viewCount?: string
  videoCount?: string
  thumbnailUrl?: string
  publishedAt?: string
}

/**
 * YouTube API 错误详情
 */
export type YouTubeAPIError = {
  status: number
  code?: string
  message: string
  details?: string
}

/**
 * 搜索统计信息
 */
export type SearchStats = {
  query: string
  rawSearchCount: number
  fetchedVideoCount: number
  uniqueVideoCount: number
  uniqueChannelCount: number  // 新增：去重后的频道数
  cacheHit: boolean           // 新增：是否命中缓存
  cacheAge?: number           // 新增：缓存年龄（毫秒）
  quotaExceeded?: boolean     // 新增：是否触发配额耗尽
  apiError?: YouTubeAPIError
}

type YouTubeSearchResponse = {
  items?: Array<{
    id?: {
      videoId?: string
    }
    snippet?: {
      channelId?: string
      channelTitle?: string
      title?: string
      publishedAt?: string
    }
  }>
}

type YouTubeVideosResponse = {
  items?: Array<{
    id?: string
    snippet?: {
      title?: string
      channelId?: string
      channelTitle?: string
      publishedAt?: string
      description?: string
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

/**
 * YouTube API 请求封装（配额保护 + Fail Fast + Abort）
 */
async function youtubeFetch<T>(
  endpoint: string, 
  params: Record<string, string>,
  currentQuery?: string  // 新增：当前查询，用于记录
): Promise<T> {
  // Fail Fast: 如果配额已用尽，立即抛出错误
  if (quotaExceededFlag) {
    const error = new Error('YouTube API quota exceeded (fail fast)') as Error & { apiError: YouTubeAPIError }
    error.apiError = {
      status: 403,
      code: 'quotaExceeded',
      message: 'API quota exceeded. Please wait for quota reset at UTC midnight (Beijing 08:00).',
      details: `Quota exceeded at ${new Date(quotaExceededTime).toISOString()}`,
    }
    throw error
  }

  // 🆕 创建新的 AbortController
  abortController = new AbortController()

  const apiKey = getApiKey()
  const url = new URL(`${API_BASE}/${endpoint}`)
  const searchParams = new URLSearchParams({
    key: apiKey,
    ...params,
  })
  url.search = searchParams.toString()

  console.log(`[YouTube API] ${endpoint}:`, params)

  // 🆕 添加 AbortSignal，禁止重试
  const response = await fetch(url.toString(), {
    signal: abortController.signal,
    cache: 'no-store',  // 禁止缓存，避免浏览器自动重试
  })
  
  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    let errorDetails: YouTubeAPIError = {
      status: response.status,
      message: response.statusText,
      details: errorText,
    }

    // 尝试解析 YouTube API 错误格式
    try {
      const errorJson = JSON.parse(errorText)
      if (errorJson.error) {
        errorDetails.code = errorJson.error.code || String(response.status)
        errorDetails.message = errorJson.error.message || response.statusText
        if (errorJson.error.errors && errorJson.error.errors[0]) {
          errorDetails.details = errorJson.error.errors[0].reason || errorText
          
          // 检测配额耗尽
          if (errorJson.error.errors[0].reason === 'quotaExceeded') {
            quotaExceededFlag = true
            quotaExceededTime = Date.now()
            quotaExceededAtQuery = currentQuery || params.q || 'unknown'  // 🆕 记录触发查询
            
            console.error(`[YouTube API] QUOTA EXCEEDED at query: "${quotaExceededAtQuery}"`)
            console.error('[YouTube API] Setting fail fast flag and aborting all queries')
            
            // 🆕 立即中止所有查询（retry=0）
            abortAllQueries()
            
            // 添加重置时间提示
            const now = new Date()
            const utcMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0))
            const beijingReset = new Date(utcMidnight.getTime() + 8 * 60 * 60 * 1000)
            
            errorDetails.message = `API quota exceeded at query "${quotaExceededAtQuery}". Resets at ${beijingReset.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })} Beijing time.`
          }
        }
      }
    } catch {
      // 使用原始错误文本
    }

    console.error(`[YouTube API Error] ${endpoint}:`, errorDetails)
    
    const error = new Error(`YouTube API ${errorDetails.code || response.status}: ${errorDetails.message}`) as Error & { apiError: YouTubeAPIError }
    error.apiError = errorDetails
    throw error
  }

  const data = (await response.json()) as T
  console.log(`[YouTube API Success] ${endpoint}: returned ${JSON.stringify(data).length} bytes`)
  return data
}

/**
 * 搜索视频（优化版：缓存 + Fail Fast + 频道去重）
 * @param query 搜索关键词
 * @param maxResults 最大结果数
 * @param debug 调试模式（宽松搜索）
 * @param useCache 是否使用缓存
 */
export async function searchVideos(
  query: string,
  maxResults = 25,
  debug = false,
  useCache = true
): Promise<{ videoIds: string[]; channelIds: string[]; stats: SearchStats }> {
  const stats: SearchStats = {
    query,
    rawSearchCount: 0,
    fetchedVideoCount: 0,
    uniqueVideoCount: 0,
    uniqueChannelCount: 0,
    cacheHit: false,
  }

  if (!query || !query.trim()) {
    console.warn('[searchVideos] Empty query')
    return { videoIds: [], channelIds: [], stats }
  }

  // 1. 尝试从缓存获取
  const cacheKey = buildCacheKey('search', { query, maxResults, debug })
  
  if (useCache) {
    const cached = cache.get<{ videoIds: string[]; channelIds: string[] }>(cacheKey)
    if (cached) {
      const cacheInfo = cache.getCacheInfo(cacheKey)
      stats.cacheHit = true
      stats.cacheAge = cacheInfo?.age
      stats.fetchedVideoCount = cached.videoIds.length
      stats.uniqueVideoCount = cached.videoIds.length
      stats.uniqueChannelCount = cached.channelIds.length
      
      console.log(`[searchVideos] Cache HIT for "${query}" (age: ${((cacheInfo?.age || 0) / 1000 / 60).toFixed(0)} min)`)
      return { videoIds: cached.videoIds, channelIds: cached.channelIds, stats }
    }
  }

  // 2. 缓存未命中，调用 API
  stats.cacheHit = false

  try {
    const params: Record<string, string> = {
      part: 'snippet',  // 改为 snippet 以获取 channelId
      type: 'video',
      q: query,
      maxResults: String(maxResults),
    }

    // 非调试模式：添加时间和地域限制
    if (!debug) {
      // 60 天前
      const sixtyDaysAgo = new Date()
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)
      params.publishedAfter = sixtyDaysAgo.toISOString()
      
      // 优先北美内容
      params.regionCode = 'US'
      params.relevanceLanguage = 'en'
    }

    console.log(`[searchVideos] API call for "${query}", maxResults: ${maxResults}, debug: ${debug}`)

    const data = await youtubeFetch<YouTubeSearchResponse>('search', params, query)  // 传递当前查询

    const items = data.items ?? []
    stats.rawSearchCount = items.length
    
    const videoIds = items
      .map(item => item.id?.videoId)
      .filter((id): id is string => Boolean(id))
    
    // 提取 channelIds（去重）
    const channelIds = Array.from(new Set(
      items
        .map(item => item.snippet?.channelId)
        .filter((id): id is string => Boolean(id))
    ))
    
    stats.fetchedVideoCount = videoIds.length
    stats.uniqueVideoCount = new Set(videoIds).size
    stats.uniqueChannelCount = channelIds.length

    console.log(`[searchVideos] Success: ${stats.rawSearchCount} raw, ${stats.uniqueChannelCount} unique channels`)

    // 3. 存入缓存（24 小时 TTL）
    if (useCache && videoIds.length > 0) {
      cache.set(cacheKey, { videoIds, channelIds }, { ttlMs: 24 * 60 * 60 * 1000 })
      console.log(`[searchVideos] Cached result for "${query}" (TTL: 24h)`)
    }

    return { videoIds, channelIds, stats }
  } catch (error) {
    if (error && typeof error === 'object' && 'apiError' in error) {
      const apiError = (error as { apiError: YouTubeAPIError }).apiError
      stats.apiError = apiError
      
      // 🆕 检测配额耗尽
      if (apiError.code === 'quotaExceeded' || apiError.details === 'quotaExceeded') {
        stats.quotaExceeded = true
      }
    }
    console.error(`[searchVideos] Error for query "${query}":`, error)
    return { videoIds: [], channelIds: [], stats }
  }
}

export async function getVideos(videoIds: string[]): Promise<YouTubeVideo[]> {
  if (videoIds.length === 0) {
    return []
  }

  const uniqueIds = Array.from(new Set(videoIds))
  const chunks: string[][] = []
  const maxPerRequest = 50

  for (let i = 0; i < uniqueIds.length; i += maxPerRequest) {
    chunks.push(uniqueIds.slice(i, i + maxPerRequest))
  }

  const results: YouTubeVideo[] = []

  for (const chunk of chunks) {
    const data = await youtubeFetch<YouTubeVideosResponse>('videos', {
      part: 'snippet',
      id: chunk.join(','),
    })

    const items = data.items ?? []
    for (const item of items) {
      const snippet = item.snippet
      if (!item.id || !snippet) {
        continue
      }
      results.push({
        videoId: item.id,
        title: snippet.title ?? '',
        channelId: snippet.channelId ?? '',
        channelTitle: snippet.channelTitle ?? '',
        publishedAt: snippet.publishedAt ?? '',
        description: snippet.description ?? '',
      })
    }
  }

  return results
}

/**
 * 获取频道详细信息
 * @param channelIds 频道 ID 数组
 * @returns 频道详细信息数组
 */
export async function getChannels(channelIds: string[]): Promise<YouTubeChannel[]> {
  if (channelIds.length === 0) {
    return []
  }

  const uniqueIds = Array.from(new Set(channelIds))
  const chunks: string[][] = []
  const maxPerRequest = 50

  // 分批处理（每批最多 50 个 ID）
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
        title: snippet.title ?? '',
        description: snippet.description,
        customUrl: snippet.customUrl,
        country: snippet.country,
        subscriberCount: statistics?.subscriberCount,
        videoCount: statistics?.videoCount,
        viewCount: statistics?.viewCount,
        thumbnailUrl: snippet.thumbnails?.high?.url ?? snippet.thumbnails?.medium?.url,
        publishedAt: snippet.publishedAt,
      })
    }
  }

  return results
}

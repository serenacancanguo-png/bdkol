import { NextRequest, NextResponse } from 'next/server'
import yaml from 'js-yaml'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { buildQuery, buildExploreQueries as buildExploreQueriesNew, type QueryBuilderInput } from '@/src/lib/queryBuilder'
import { rankChannels, formatEvidences, type ScoringResult, type EvidenceType } from '@/src/lib/channelScoring'

// ========================================
// Types
// ========================================

type KeywordTemplate = {
  id: string
  query: string
}

type ChannelResult = {
  channelId: string
  channelTitle: string
  channelUrl: string
  subscriberCount: number
  relevanceScore: number
  evidence: string[]
  thumbnail: string  // 🆕 频道头像
  description?: string  // 🆕 频道描述（用于相似推荐）
  contactEmail?: string
  evidenceTags?: Array<{  // 🆕 证据标签（why this channel）
    label: string
    type: EvidenceType
    count: number
  }>
}

type ApiResponse = {
  success: boolean
  competitor: string
  template: string
  channels: ChannelResult[]
  quotaInfo: {
    searchCalls: number
    videosCalls: number
    channelsCalls: number
    totalUnits: number
    cacheHit: boolean
    cacheHits?: number
    resetTime: string
  }
  debugStats?: {
    finalQuery: string
    queryComponents?: {
      competitorAnchor: string
      industryAnchor: string
      commercialAnchor: string
      negativeKeywords?: string
    }
    exploreQueries?: string[]
  }
  error?: string
}

type CacheEntry = {
  data: ChannelResult[]
  timestamp: number
  ttl: number
}

type SearchQueryCacheEntry = {
  videoIds: string[]
  channelIds: string[]
  fetchedAt: string
  timestamp: number
  ttl: number
}

type ChannelCacheEntry = {
  data: any
  timestamp: number
  ttl: number
}

// ========================================
// Keyword Templates (同前端定义)
// ========================================

const KEYWORD_TEMPLATES: KeywordTemplate[] = [
  { id: 'contract_rebate', query: 'perps fee rebate' },
  { id: 'contract_partnership', query: 'futures partnership program' },
  { id: 'contract_code', query: 'crypto futures referral code' },
  { id: 'competitor_partnership', query: '{competitor} futures partnership' },
  { id: 'signals_vip', query: 'futures signals VIP join' },
  { id: 'tutorial_referral', query: 'tutorial perps referral link' },
]

// ========================================
// Memory Cache (24h TTL)
// ========================================

const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours
const QUERY_CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours
const CHANNEL_CACHE_TTL = 7 * 24 * 60 * 60 * 1000 // 7 days
const memoryCache = new Map<string, CacheEntry>()
const searchQueryCache = new Map<string, SearchQueryCacheEntry>()
const channelCache = new Map<string, ChannelCacheEntry>()

function getCacheKey(
  platform: string,
  competitor: string,
  templateId: string,
  exploreMode: boolean,
  recent180d: boolean,
  regionCode: string = 'US'
): string {
  // 🔒 缓存键必须包含所有影响结果的参数，确保竞品切换时不复用缓存
  const normalized = `${platform}_${competitor}_${templateId}_${exploreMode ? 'explore' : 'standard'}_${recent180d ? '180d' : 'alltime'}_${regionCode}`
    .toLowerCase()
    .trim()
  return crypto.createHash('md5').update(normalized).digest('hex')
}

function getFromCache(key: string): ChannelResult[] | null {
  const entry = memoryCache.get(key)
  if (!entry) return null
  
  const now = Date.now()
  if (now - entry.timestamp > entry.ttl) {
    memoryCache.delete(key)
    return null
  }
  
  console.log(`[Cache] HIT: ${key}`)
  return entry.data
}

function setCache(key: string, data: ChannelResult[]): void {
  memoryCache.set(key, {
    data,
    timestamp: Date.now(),
    ttl: CACHE_TTL,
  })
  console.log(`[Cache] SET: ${key}`)
}

// ========================================
// YouTube API Helper
// ========================================

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || ''

function getQueryCacheKey(query: string, maxResults: number, publishedAfter?: string, regionCode: string = 'US'): string {
  const normalized = `${query.toLowerCase().trim().replace(/\s+/g, ' ')}|${maxResults}|${publishedAfter || 'none'}|${regionCode}`
  return crypto.createHash('md5').update(normalized).digest('hex')
}

function buildExploreQueries(baseQuery: string): string[] {
  const queries: string[] = []
  const add = (q: string) => {
    const normalized = q.trim().replace(/\s+/g, ' ')
    if (normalized && !queries.includes(normalized)) queries.push(normalized)
  }

  const swapSynonyms = (query: string): string => {
    let result = query
    if (/\bperps\b/i.test(result)) {
      result = result.replace(/\bperps\b/gi, 'futures')
    } else if (/\bfutures\b/i.test(result)) {
      result = result.replace(/\bfutures\b/gi, 'perps')
    }

    if (/\bsignals\b/i.test(result)) {
      result = result.replace(/\bsignals\b/gi, 'alerts')
    } else if (/\balerts\b/i.test(result)) {
      result = result.replace(/\balerts\b/gi, 'signals')
    }

    return result
  }

  add(baseQuery)
  add(`${baseQuery} long short`)
  add(swapSynonyms(baseQuery))
  add(`${baseQuery} referral`)

  return queries.slice(0, 4)
}

async function youtubeSearch(query: string, maxResults: number = 25, publishedAfter?: string, regionCode: string = 'US'): Promise<{
  videoIds: string[]
  channelIds: string[]
  cacheHit: boolean
}> {
  const cacheKey = getQueryCacheKey(query, maxResults, publishedAfter, regionCode)
  const cached = searchQueryCache.get(cacheKey)
  const now = Date.now()
  if (cached && now - cached.timestamp <= cached.ttl) {
    console.log(`[Search Query Cache] HIT: "${query}"`)
    return {
      videoIds: cached.videoIds,
      channelIds: cached.channelIds,
      cacheHit: true,
    }
  }

  const url = new URL('https://www.googleapis.com/youtube/v3/search')
  url.searchParams.set('key', YOUTUBE_API_KEY)
  url.searchParams.set('part', 'snippet')
  url.searchParams.set('type', 'video')
  url.searchParams.set('maxResults', String(maxResults))
  url.searchParams.set('order', 'relevance')
  url.searchParams.set('regionCode', regionCode) // 🆕 使用可配置的 regionCode
  url.searchParams.set('relevanceLanguage', 'en')
  if (publishedAfter) {
    url.searchParams.set('publishedAfter', publishedAfter)
  }
  url.searchParams.set('q', query)

  console.log(`[YouTube] search.list: "${query}"`)
  const response = await fetch(url.toString())

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`YouTube API error ${response.status}: ${errorText}`)
  }

  const data = await response.json()
  const items = data.items || []

  const videoIds: string[] = []
  const channelIds: string[] = []

  for (const item of items) {
    if (item.id?.videoId) {
      videoIds.push(item.id.videoId)
    }
    if (item.snippet?.channelId) {
      channelIds.push(item.snippet.channelId)
    }
  }

  console.log(`[YouTube] Found ${videoIds.length} videos, ${new Set(channelIds).size} unique channels`)
  const channelIdsUnique = Array.from(new Set(channelIds))

  searchQueryCache.set(cacheKey, {
    videoIds,
    channelIds: channelIdsUnique,
    fetchedAt: new Date().toISOString(),
    timestamp: now,
    ttl: QUERY_CACHE_TTL,
  })

  return { videoIds, channelIds: channelIdsUnique, cacheHit: false }
}

async function youtubeVideos(videoIds: string[]): Promise<any[]> {
  if (videoIds.length === 0) return []

  const url = new URL('https://www.googleapis.com/youtube/v3/videos')
  url.searchParams.set('key', YOUTUBE_API_KEY)
  url.searchParams.set('part', 'snippet,statistics,contentDetails')
  url.searchParams.set('id', videoIds.slice(0, 50).join(',')) // Max 50

  console.log(`[YouTube] videos.list: ${videoIds.length} IDs (batch: ${Math.min(videoIds.length, 50)})`)
  const response = await fetch(url.toString())

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`YouTube API error ${response.status}: ${errorText}`)
  }

  const data = await response.json()
  return data.items || []
}

async function youtubeChannels(channelIds: string[]): Promise<any[]> {
  if (channelIds.length === 0) return []

  const url = new URL('https://www.googleapis.com/youtube/v3/channels')
  url.searchParams.set('key', YOUTUBE_API_KEY)
  url.searchParams.set('part', 'snippet,statistics,brandingSettings')
  url.searchParams.set('id', channelIds.slice(0, 50).join(',')) // Max 50

  console.log(`[YouTube] channels.list: ${channelIds.length} IDs (batch: ${Math.min(channelIds.length, 50)})`)
  const response = await fetch(url.toString())

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`YouTube API error ${response.status}: ${errorText}`)
  }

  const data = await response.json()
  return data.items || []
}

async function getChannelsWithCache(channelIds: string[]): Promise<{
  channels: any[]
  apiCalls: number
  cacheHits: number
}> {
  const now = Date.now()
  const channels: any[] = []
  const missing: string[] = []
  let cacheHits = 0

  for (const id of channelIds) {
    const cached = channelCache.get(id)
    if (cached && now - cached.timestamp <= cached.ttl) {
      channels.push(cached.data)
      cacheHits++
    } else {
      missing.push(id)
    }
  }

  let apiCalls = 0
  for (let i = 0; i < missing.length; i += 50) {
    const batch = missing.slice(i, i + 50)
    if (batch.length === 0) continue
    const fetched = await youtubeChannels(batch)
    apiCalls++
    for (const ch of fetched) {
      channelCache.set(ch.id, {
        data: ch,
        timestamp: Date.now(),
        ttl: CHANNEL_CACHE_TTL,
      })
      channels.push(ch)
    }
  }

  return { channels, apiCalls, cacheHits }
}

// ========================================
// Relevance Scoring & Evidence Extraction
// ========================================

const COMMERCIAL_KEYWORDS = [
  'referral', 'partnership', 'promo code', 'rebate', 'fee discount',
  'sign up bonus', 'affiliate', 'sponsored'
]

const CONTRACT_KEYWORDS = [
  'futures', 'perps', 'perpetual', 'leverage', 'funding rate',
  'open interest', 'liquidation', 'mark price', 'order book', 'long/short',
  'cross margin', 'isolated margin'
]

const QUALITY_INDICATORS = [
  'review', 'fees', 'best exchange', 'tutorial', 'guide', 'how to'
]

const RISK_FLAGS = [
  'guaranteed', '100x', 'risk-free', 'never lose', 'scam'
]

function calculateRelevanceScore(title: string, description: string): {
  score: number
  evidence: string[]
} {
  const text = `${title} ${description}`.toLowerCase()
  let score = 0
  const evidence: string[] = []

  // Contract keywords (+8 each)
  for (const kw of CONTRACT_KEYWORDS) {
    if (text.includes(kw.toLowerCase())) {
      score += 8
      evidence.push(`Contract: "${kw}"`)
    }
  }

  // Commercial keywords (+10 each)
  for (const kw of COMMERCIAL_KEYWORDS) {
    if (text.includes(kw.toLowerCase())) {
      score += 10
      evidence.push(`Commercial: "${kw}"`)
    }
  }

  // Quality indicators (+5 each)
  for (const kw of QUALITY_INDICATORS) {
    if (text.includes(kw.toLowerCase())) {
      score += 5
      evidence.push(`Quality: "${kw}"`)
    }
  }

  // Risk flags (-20 each)
  for (const kw of RISK_FLAGS) {
    if (text.includes(kw.toLowerCase())) {
      score -= 20
      evidence.push(`⚠️ Risk: "${kw}"`)
    }
  }

  // External links (+15)
  if (text.match(/https?:\/\//)) {
    score += 15
    evidence.push('External link found')
  }

  return { score: Math.max(0, score), evidence: evidence.slice(0, 3) }
}

function extractContactEmail(text: string): string | undefined {
  const match = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)
  return match?.[0]
}

// ========================================
// Main Handler
// ========================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      competitor, 
      platform, 
      templateId, 
      exploreMode = false, 
      recent180d = false,
      regionCode = 'US' // 🆕 默认美国区
    } = body

    console.log(
      `[run-single-query] Received: competitor=${competitor}, platform=${platform}, template=${templateId}, exploreMode=${exploreMode}, recent180d=${recent180d}, region=${regionCode}`
    )

    // Validate
    if (!competitor || !platform || !templateId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: competitor, platform, templateId',
      }, { status: 400 })
    }

    if (!YOUTUBE_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'YOUTUBE_API_KEY is not configured',
      }, { status: 500 })
    }

    // Get template
    const template = KEYWORD_TEMPLATES.find(t => t.id === templateId)
    if (!template) {
      return NextResponse.json({
        success: false,
        error: `Invalid templateId: ${templateId}`,
      }, { status: 400 })
    }

    // Load competitor config (needed for both cache and query building)
    const configPath = path.join(process.cwd(), 'config', 'competitors.yaml')
    const configFile = fs.readFileSync(configPath, 'utf-8')
    const config = yaml.load(configFile) as { competitors: any[] }
    const competitorData = config.competitors.find((c: any) => c.id === competitor)
    if (!competitorData) {
      return NextResponse.json({
        success: false,
        error: `Competitor not found: ${competitor}`,
      }, { status: 400 })
    }

    // Check cache (🔒 包含所有影响结果的参数，确保竞品切换时不复用缓存)
    const cacheKey = getCacheKey(platform, competitor, templateId, Boolean(exploreMode), Boolean(recent180d), regionCode)
    const cachedResult = getFromCache(cacheKey)
    if (cachedResult) {
      // Build query for debugStats (even from cache)
      const queryBuilderInput: QueryBuilderInput = {
        competitor,
        competitorAliases: competitorData.brand_names || [],
        platform: platform as 'youtube' | 'x',
        templateId
      }
      const queryResult = buildQuery(queryBuilderInput)
      
      const resetTime = new Date(Date.now() + CACHE_TTL).toISOString()
      return NextResponse.json({
        success: true,
        competitor,
        template: templateId,
        channels: cachedResult,
        quotaInfo: {
          searchCalls: 0,
          videosCalls: 0,
          channelsCalls: 0,
          totalUnits: 0,
          cacheHit: true,
          resetTime,
        },
        debugStats: {
          finalQuery: queryResult.finalQuery,
          queryComponents: queryResult.components,
          exploreQueries: exploreMode ? buildExploreQueriesNew(queryBuilderInput) : undefined,
        },
      })
    }

    // Build query using new queryBuilder
    const queryBuilderInput: QueryBuilderInput = {
      competitor,
      competitorAliases: competitorData.brand_names || [],
      platform: platform as 'youtube' | 'x',
      templateId
    }
    
    const queryResult = buildQuery(queryBuilderInput)
    const finalQuery = queryResult.finalQuery
    const queryComponents = queryResult.components
    
    const publishedAfter = recent180d
      ? new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString()
      : undefined
    
    // Generate query variants for Explore Mode
    const queries = exploreMode 
      ? buildExploreQueriesNew(queryBuilderInput)
      : [finalQuery]

    console.log(`[run-single-query] Final Query: ${finalQuery}`)
    console.log(`[run-single-query] Query Components:`, queryComponents)
    console.log(`[run-single-query] Query set (${queries.length}):`, queries)

    // Step 1: Search - 标准模式 1 次，探索模式最多 4 次
    const mergedVideoIds: string[] = []
    const mergedChannelIds: string[] = []
    const videoSet = new Set<string>()
    const channelSet = new Set<string>()
    let searchCalls = 0
    let queryCacheHits = 0

    for (const q of queries.slice(0, 4)) {
      const { videoIds, channelIds, cacheHit } = await youtubeSearch(q, 50, publishedAfter, regionCode)
      if (cacheHit) queryCacheHits++
      else searchCalls++

      for (const id of videoIds) {
        if (!videoSet.has(id)) {
          videoSet.add(id)
          mergedVideoIds.push(id)
        }
      }
      for (const id of channelIds) {
        if (!channelSet.has(id)) {
          channelSet.add(id)
          mergedChannelIds.push(id)
        }
      }
    }

    if (mergedVideoIds.length === 0) {
      return NextResponse.json({
        success: true,
        competitor,
        template: templateId,
        channels: [],
        quotaInfo: {
          searchCalls,
          videosCalls: 0,
          channelsCalls: 0,
          totalUnits: searchCalls * 100,
          cacheHit: false,
          cacheHits: queryCacheHits,
          resetTime: new Date(Date.now() + 86400000).toISOString(),
        },
      })
    }

    // Step 2: Get video details (1 call, 1 unit) - 截取前 50 个去重视频
    const videos = await youtubeVideos(mergedVideoIds.slice(0, 50))

    // Step 3: Get channel details（带 7 天缓存）
    const videoChannelIds = Array.from(
      new Set(videos.map(v => v.snippet?.channelId).filter((id): id is string => Boolean(id)))
    )
    const { channels, apiCalls: channelsApiCalls, cacheHits: channelCacheHits } = await getChannelsWithCache(videoChannelIds)

    // Step 4: 准备数据用于智能评分（group videos by channel）
    const channelVideosMap = new Map<string, Array<{ title: string; description: string }>>()
    
    for (const video of videos) {
      const channelId = video.snippet?.channelId
      if (!channelId) continue
      
      const title = video.snippet?.title || ''
      const description = video.snippet?.description || ''
      
      if (!channelVideosMap.has(channelId)) {
        channelVideosMap.set(channelId, [])
      }
      channelVideosMap.get(channelId)!.push({ title, description })
    }

    // Step 5: 使用智能评分引擎进行 rerank
    const scoringInput = Array.from(channelVideosMap.entries()).map(([channelId, videos]) => {
      const channelInfo = channels.find(ch => ch.id === channelId)
      return {
        channelId,
        channelDescription: channelInfo?.snippet?.description || '',
        videos: videos.slice(0, 10), // 最多分析 10 条视频
        subscriberCount: parseInt(channelInfo?.statistics?.subscriberCount || '0', 10)
      }
    })

    const rankedResults = rankChannels(scoringInput, competitorData.brand_names || [])
    
    console.log(`[run-single-query] Rerank: ${rankedResults.length}/${scoringInput.length} channels passed thresholds`)
    rankedResults.slice(0, 5).forEach((r, idx) => {
      console.log(`  ${idx + 1}. Score ${r.totalScore}, Evidence: ${r.evidenceList.length} items`)
    })

    // Step 6: Build results with evidence tags
    const results: ChannelResult[] = rankedResults.map(scored => {
      const channelInfo = channels.find(ch => ch.id === scored.channelId)
      const thumbnails = channelInfo?.snippet?.thumbnails
      const thumbnail = thumbnails?.medium?.url || thumbnails?.default?.url || thumbnails?.high?.url || ''
      const description = channelInfo?.snippet?.description || ''
      
      return {
        channelId: scored.channelId,
        channelTitle: channelInfo?.snippet?.title || '',
        channelUrl: `https://www.youtube.com/channel/${scored.channelId}`,
        subscriberCount: parseInt(channelInfo?.statistics?.subscriberCount || '0', 10),
        relevanceScore: scored.totalScore,
        evidence: formatEvidences(scored.evidenceList).slice(0, 3).map(e => `"${e.label}"`),
        thumbnail,
        description,
        contactEmail: extractContactEmail(description),
        evidenceTags: formatEvidences(scored.evidenceList).slice(0, 10), // 🆕 证据标签
      }
    })

    // Save to cache
    setCache(cacheKey, results)

    const resetTime = new Date(Date.now() + 86400000).toISOString() // 24h from now

    return NextResponse.json({
      success: true,
      competitor,
      template: templateId,
      channels: results,
      quotaInfo: {
        searchCalls,
        videosCalls: 1,
        channelsCalls: channelsApiCalls,
        totalUnits: (searchCalls * 100) + 1 + channelsApiCalls,
        cacheHit: false,
        cacheHits: queryCacheHits + channelCacheHits,
        resetTime,
      },
      debugStats: {
        finalQuery,
        queryComponents,
        exploreQueries: exploreMode ? queries : undefined,
      },
    })
  } catch (error: any) {
    console.error('[run-single-query] Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error',
    }, { status: 500 })
  }
}

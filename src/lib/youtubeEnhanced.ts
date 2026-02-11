/**
 * YouTube API 增强版（集成三层缓存）
 * L1: query + competitor → channelIds
 * L2: channelId → channel stats
 * L3: videoId → video details
 */

import { 
  searchVideos as originalSearchVideos,
  getChannels as originalGetChannels,
  getVideos as originalGetVideos,
  type YouTubeVideo,
  type YouTubeChannel,
  type SearchStats
} from './youtube'
import { L1Cache, L2Cache, L3Cache, type L2CacheData, type L3CacheData } from './cacheL3'
import { QuotaBudgetManager } from './quotaBudget'

/**
 * 搜索视频（增强版：使用 L1 缓存，完全跳过 search.list）
 * 
 * L1 Cache Hit → 直接返回缓存数据，**0 API 调用**
 * L1 Cache Miss → 调用 search.list，存入 L1 缓存
 */
export async function searchVideosWithL1Cache(
  query: string,
  competitor: string,
  maxResults: number = 25,
  budgetManager?: QuotaBudgetManager
): Promise<{
  videoIds: string[]
  channelIds: string[]
  stats: SearchStats
}> {
  // 🆕 L1 缓存检查（使用统一的 Key 规范化）
  const l1Data = L1Cache.get(query, competitor)
  
  if (l1Data) {
    // ✅ L1 Cache HIT - 完全跳过 search.list
    const cacheAge = Date.now() - new Date(l1Data.fetchedAt).getTime()
    console.log(`[searchVideosWithL1Cache] ✅ L1 Cache HIT - SKIPPING search.list`)
    console.log(`[searchVideosWithL1Cache]   Query: "${query}" + Competitor: "${competitor}"`)
    console.log(`[searchVideosWithL1Cache]   Cache age: ${Math.floor(cacheAge / 1000 / 60)}min, Channels: ${l1Data.channelIds.length}, Videos: ${l1Data.videoIds.length}`)
    
    if (budgetManager) {
      budgetManager.recordSearchCall(true)  // 缓存命中，0 配额消耗
    }
    
    return {
      videoIds: l1Data.videoIds,
      channelIds: l1Data.channelIds,
      stats: {
        query,
        rawSearchCount: l1Data.videoIds.length,
        fetchedVideoCount: l1Data.videoIds.length,
        uniqueVideoCount: l1Data.videoIds.length,
        uniqueChannelCount: l1Data.channelIds.length,
        cacheHit: true,
        cacheAge: cacheAge,
      },
    }
  }
  
  // ❌ L1 缓存未命中，调用原始 search.list API
  console.log(`[searchVideosWithL1Cache] ❌ L1 Cache MISS - Calling search.list API`)
  console.log(`[searchVideosWithL1Cache]   Query: "${query}" + Competitor: "${competitor}"`)
  
  if (budgetManager) {
    budgetManager.recordSearchCall(false)  // API 调用，100 units
  }
  
  const result = await originalSearchVideos(query, maxResults, false, false)
  
  // 存入 L1 缓存（使用新的 API）
  L1Cache.set(
    query, 
    competitor, 
    result.channelIds, 
    result.videoIds,
    24 * 60 * 60 * 1000  // TTL: 24h
  )
  
  console.log(`[searchVideosWithL1Cache] 💾 Stored in L1 cache: ${result.channelIds.length} channels, ${result.videoIds.length} videos`)
  
  return result
}

/**
 * 获取频道信息（增强版：使用 L2 缓存）
 */
export async function getChannelsWithL2Cache(
  channelIds: string[],
  budgetManager?: QuotaBudgetManager
): Promise<YouTubeChannel[]> {
  if (channelIds.length === 0) {
    return []
  }
  
  // L2 缓存批量查询
  const cachedChannels = L2Cache.getBatch(channelIds)
  const cachedIds = new Set(cachedChannels.keys())
  const missingIds = channelIds.filter(id => !cachedIds.has(id))
  
  console.log(`[getChannelsWithL2Cache] L2 Cache: ${cachedChannels.size} hits, ${missingIds.length} misses`)
  
  const results: YouTubeChannel[] = []
  
  // 从缓存转换
  cachedChannels.forEach(l2Data => {
    results.push({
      channelId: l2Data.channelId,
      title: l2Data.title,
      description: l2Data.description,
      subscriberCount: l2Data.subscriberCount.toString(),
      videoCount: l2Data.videoCount.toString(),
      viewCount: l2Data.viewCount.toString(),
      country: l2Data.country,
      customUrl: l2Data.customUrl,
      publishedAt: l2Data.publishedAt,
    })
  })
  
  // 获取缺失的频道
  if (missingIds.length > 0) {
    if (budgetManager) {
      const callsNeeded = Math.ceil(missingIds.length / 50)
      budgetManager.recordChannelsCall(callsNeeded)
    }
    
    const fetchedChannels = await originalGetChannels(missingIds)
    results.push(...fetchedChannels)
    
    // 存入 L2 缓存
    const l2Data: L2CacheData[] = fetchedChannels.map(ch => ({
      channelId: ch.channelId,
      title: ch.title,
      description: ch.description || '',
      subscriberCount: parseInt(ch.subscriberCount || '0'),
      videoCount: parseInt(ch.videoCount || '0'),
      viewCount: parseInt(ch.viewCount || '0'),
      country: ch.country,
      customUrl: ch.customUrl,
      publishedAt: ch.publishedAt || '',
    }))
    L2Cache.setBatch(l2Data, 24 * 60 * 60 * 1000)
  }
  
  return results
}

/**
 * 获取视频详情（增强版：使用 L3 缓存）
 */
export async function getVideosWithL3Cache(
  videoIds: string[],
  budgetManager?: QuotaBudgetManager
): Promise<YouTubeVideo[]> {
  if (videoIds.length === 0) {
    return []
  }
  
  // L3 缓存批量查询
  const cachedVideos = L3Cache.getBatch(videoIds)
  const cachedIds = new Set(cachedVideos.keys())
  const missingIds = videoIds.filter(id => !cachedIds.has(id))
  
  console.log(`[getVideosWithL3Cache] L3 Cache: ${cachedVideos.size} hits, ${missingIds.length} misses`)
  
  const results: YouTubeVideo[] = []
  
  // 从缓存转换
  cachedVideos.forEach(l3Data => {
    results.push({
      videoId: l3Data.videoId,
      title: l3Data.title,
      description: l3Data.description,
      channelId: l3Data.channelId,
      channelTitle: l3Data.channelTitle,
      publishedAt: l3Data.publishedAt,
    })
  })
  
  // 获取缺失的视频
  if (missingIds.length > 0) {
    if (budgetManager) {
      const callsNeeded = Math.ceil(missingIds.length / 50)
      budgetManager.recordVideosCall(callsNeeded)
    }
    
    const fetchedVideos = await originalGetVideos(missingIds)
    results.push(...fetchedVideos)
    
    // 存入 L3 缓存
    const l3Data: L3CacheData[] = fetchedVideos.map(v => ({
      videoId: v.videoId,
      title: v.title,
      description: v.description,
      channelId: v.channelId,
      channelTitle: v.channelTitle,
      publishedAt: v.publishedAt,
      viewCount: 0,  // 原始 API 没有提供
      likeCount: 0,
      commentCount: 0,
      duration: '',
    }))
    L3Cache.setBatch(l3Data, 24 * 60 * 60 * 1000)
  }
  
  return results
}

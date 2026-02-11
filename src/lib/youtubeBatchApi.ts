/**
 * YouTube Batch API
 * 批量调用 videos.list 和 channels.list，最小化配额消耗
 */

import type { YouTubeVideo, YouTubeChannel } from './youtube'

/**
 * 批量获取视频信息
 * 
 * @param videoIds - Video IDs 数组
 * @returns 视频信息数组
 * 
 * 配额成本: Math.ceil(videoIds.length / 50) units
 */
export async function getVideosBatch(
  videoIds: string[]
): Promise<{
  videos: YouTubeVideo[]
  quotaUsed: number
  errors: string[]
}> {
  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) {
    throw new Error('YOUTUBE_API_KEY not found in environment')
  }
  
  const videos: YouTubeVideo[] = []
  const errors: string[] = []
  let quotaUsed = 0
  
  // 去重
  const uniqueIds = Array.from(new Set(videoIds))
  
  console.log(`[getVideosBatch] Processing ${uniqueIds.length} unique video IDs`)
  
  // 分批处理（每批最多 50 个）
  for (let i = 0; i < uniqueIds.length; i += 50) {
    const batch = uniqueIds.slice(i, i + 50)
    const batchNumber = Math.floor(i / 50) + 1
    
    try {
      const url = new URL('https://www.googleapis.com/youtube/v3/videos')
      url.searchParams.set('part', 'snippet,statistics,contentDetails')
      url.searchParams.set('id', batch.join(','))
      url.searchParams.set('key', apiKey)
      
      console.log(`[videos.list] Batch ${batchNumber}: ${batch.length} IDs, cost: 1 unit`)
      
      const response = await fetch(url.toString())
      
      if (!response.ok) {
        const errorText = await response.text()
        errors.push(`Batch ${batchNumber} failed: ${response.status} - ${errorText}`)
        console.error(`[videos.list] Batch ${batchNumber} error: ${response.status}`)
        continue
      }
      
      const data = await response.json()
      
      if (data.items && data.items.length > 0) {
        videos.push(...data.items)
        console.log(`[videos.list] Batch ${batchNumber}: Got ${data.items.length} videos`)
      } else {
        console.warn(`[videos.list] Batch ${batchNumber}: No videos returned`)
      }
      
      quotaUsed += 1
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      errors.push(`Batch ${batchNumber} exception: ${errorMsg}`)
      console.error(`[videos.list] Batch ${batchNumber} exception:`, error)
    }
  }
  
  console.log(`[getVideosBatch] ✅ Total: ${videos.length} videos, ${quotaUsed} units used`)
  
  return { videos, quotaUsed, errors }
}

/**
 * 批量获取频道信息
 * 
 * @param channelIds - Channel IDs 数组
 * @returns 频道信息数组
 * 
 * 配额成本: Math.ceil(channelIds.length / 50) units
 */
export async function getChannelsBatch(
  channelIds: string[]
): Promise<{
  channels: YouTubeChannel[]
  quotaUsed: number
  errors: string[]
}> {
  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) {
    throw new Error('YOUTUBE_API_KEY not found in environment')
  }
  
  const channels: YouTubeChannel[] = []
  const errors: string[] = []
  let quotaUsed = 0
  
  // 去重
  const uniqueIds = Array.from(new Set(channelIds))
  
  console.log(`[getChannelsBatch] Processing ${uniqueIds.length} unique channel IDs`)
  
  // 分批处理（每批最多 50 个）
  for (let i = 0; i < uniqueIds.length; i += 50) {
    const batch = uniqueIds.slice(i, i + 50)
    const batchNumber = Math.floor(i / 50) + 1
    
    try {
      const url = new URL('https://www.googleapis.com/youtube/v3/channels')
      url.searchParams.set('part', 'snippet,statistics,contentDetails')
      url.searchParams.set('id', batch.join(','))
      url.searchParams.set('key', apiKey)
      
      console.log(`[channels.list] Batch ${batchNumber}: ${batch.length} IDs, cost: 1 unit`)
      
      const response = await fetch(url.toString())
      
      if (!response.ok) {
        const errorText = await response.text()
        errors.push(`Batch ${batchNumber} failed: ${response.status} - ${errorText}`)
        console.error(`[channels.list] Batch ${batchNumber} error: ${response.status}`)
        continue
      }
      
      const data = await response.json()
      
      if (data.items && data.items.length > 0) {
        channels.push(...data.items)
        console.log(`[channels.list] Batch ${batchNumber}: Got ${data.items.length} channels`)
      } else {
        console.warn(`[channels.list] Batch ${batchNumber}: No channels returned`)
      }
      
      quotaUsed += 1
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      errors.push(`Batch ${batchNumber} exception: ${errorMsg}`)
      console.error(`[channels.list] Batch ${batchNumber} exception:`, error)
    }
  }
  
  console.log(`[getChannelsBatch] ✅ Total: ${channels.length} channels, ${quotaUsed} units used`)
  
  return { channels, quotaUsed, errors }
}

/**
 * 解析 Handle 为 Channel ID
 * 
 * @param handle - YouTube Handle (without @)
 * @returns Channel ID or null
 * 
 * 配额成本: 1 unit
 */
export async function resolveHandleToChannelId(
  handle: string
): Promise<{ channelId: string | null; quotaUsed: number }> {
  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) {
    throw new Error('YOUTUBE_API_KEY not found in environment')
  }
  
  try {
    const url = new URL('https://www.googleapis.com/youtube/v3/channels')
    url.searchParams.set('part', 'id')
    url.searchParams.set('forHandle', handle)
    url.searchParams.set('key', apiKey)
    
    console.log(`[resolveHandle] Resolving @${handle}`)
    
    const response = await fetch(url.toString())
    
    if (!response.ok) {
      console.error(`[resolveHandle] Error: ${response.status}`)
      return { channelId: null, quotaUsed: 1 }
    }
    
    const data = await response.json()
    
    if (data.items && data.items.length > 0) {
      const channelId = data.items[0].id
      console.log(`[resolveHandle] ✅ @${handle} → ${channelId}`)
      return { channelId, quotaUsed: 1 }
    }
    
    console.warn(`[resolveHandle] ❌ @${handle} not found`)
    return { channelId: null, quotaUsed: 1 }
    
  } catch (error) {
    console.error(`[resolveHandle] Exception:`, error)
    return { channelId: null, quotaUsed: 1 }
  }
}

/**
 * 解析 Custom URL 为 Channel ID
 * 
 * @param customUrl - Custom URL (e.g., "c/ChannelName" or "user/Username")
 * @returns Channel ID or null
 * 
 * 配额成本: 1 unit
 */
export async function resolveCustomUrlToChannelId(
  customUrl: string
): Promise<{ channelId: string | null; quotaUsed: number }> {
  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) {
    throw new Error('YOUTUBE_API_KEY not found in environment')
  }
  
  try {
    const url = new URL('https://www.googleapis.com/youtube/v3/channels')
    url.searchParams.set('part', 'id')
    url.searchParams.set('forUsername', customUrl)
    url.searchParams.set('key', apiKey)
    
    console.log(`[resolveCustomUrl] Resolving ${customUrl}`)
    
    const response = await fetch(url.toString())
    
    if (!response.ok) {
      console.error(`[resolveCustomUrl] Error: ${response.status}`)
      return { channelId: null, quotaUsed: 1 }
    }
    
    const data = await response.json()
    
    if (data.items && data.items.length > 0) {
      const channelId = data.items[0].id
      console.log(`[resolveCustomUrl] ✅ ${customUrl} → ${channelId}`)
      return { channelId, quotaUsed: 1 }
    }
    
    console.warn(`[resolveCustomUrl] ❌ ${customUrl} not found`)
    return { channelId: null, quotaUsed: 1 }
    
  } catch (error) {
    console.error(`[resolveCustomUrl] Exception:`, error)
    return { channelId: null, quotaUsed: 1 }
  }
}

/**
 * 从视频中提取频道 ID
 * 
 * @param videos - 视频数组
 * @returns 唯一的频道 ID 数组
 */
export function extractChannelIdsFromVideos(videos: any[]): string[] {
  const channelIds = new Set<string>()
  
  for (const video of videos) {
    if (video.snippet?.channelId) {
      channelIds.add(video.snippet.channelId)
    }
  }
  
  return Array.from(channelIds)
}

/**
 * 批量处理完整流程
 * 
 * @param videoIds - Video IDs
 * @param channelIds - Channel IDs
 * @param handles - Handles (without @)
 * @returns 所有频道信息和配额使用统计
 */
export async function batchProcessYouTubeData(
  videoIds: string[],
  channelIds: string[],
  handles: string[]
): Promise<{
  channels: YouTubeChannel[]
  videos: YouTubeVideo[]
  quotaUsed: number
  stats: {
    videoIdsInput: number
    channelIdsInput: number
    handlesInput: number
    videosRetrieved: number
    channelIdsFromVideos: number
    channelsRetrieved: number
    handlesResolved: number
  }
  errors: string[]
}> {
  console.log('\n🚀 [batchProcessYouTubeData] Starting batch process...\n')
  
  let totalQuota = 0
  const allErrors: string[] = []
  
  // Step 1: 批量获取视频
  console.log('📹 Step 1: Fetching videos...')
  const { videos, quotaUsed: videoQuota, errors: videoErrors } = await getVideosBatch(videoIds)
  totalQuota += videoQuota
  allErrors.push(...videoErrors)
  
  // Step 2: 从视频中提取频道 ID
  console.log('\n🔍 Step 2: Extracting channel IDs from videos...')
  const channelIdsFromVideos = extractChannelIdsFromVideos(videos)
  console.log(`[Extract] Got ${channelIdsFromVideos.length} unique channel IDs from videos`)
  
  // Step 3: 合并所有频道 ID（去重）
  console.log('\n🔀 Step 3: Merging all channel IDs...')
  const allChannelIds = Array.from(new Set([...channelIds, ...channelIdsFromVideos]))
  console.log(`[Merge] Total unique channel IDs: ${allChannelIds.length}`)
  
  // Step 4: 批量获取频道信息
  console.log('\n📺 Step 4: Fetching channels...')
  const { channels, quotaUsed: channelQuota, errors: channelErrors } = await getChannelsBatch(allChannelIds)
  totalQuota += channelQuota
  allErrors.push(...channelErrors)
  
  // Step 5: 解析 Handles（限制数量以节省配额）
  console.log('\n🏷️ Step 5: Resolving handles...')
  let handlesResolved = 0
  const MAX_HANDLES_TO_RESOLVE = 10  // 限制最多解析 10 个 handle
  
  if (handles.length > 0) {
    const handlesToResolve = handles.slice(0, MAX_HANDLES_TO_RESOLVE)
    
    if (handles.length > MAX_HANDLES_TO_RESOLVE) {
      console.warn(`[Handles] Limiting resolution to ${MAX_HANDLES_TO_RESOLVE} handles (${handles.length} total)`)
    }
    
    for (const handle of handlesToResolve) {
      const { channelId, quotaUsed: handleQuota } = await resolveHandleToChannelId(handle)
      totalQuota += handleQuota
      
      if (channelId) {
        // 获取该频道的详细信息
        const { channels: resolvedChannels, quotaUsed: resolvedQuota } = await getChannelsBatch([channelId])
        totalQuota += resolvedQuota
        channels.push(...resolvedChannels)
        handlesResolved++
      }
    }
  }
  
  console.log(`\n✅ [batchProcessYouTubeData] Completed!`)
  console.log(`   Total Quota Used: ${totalQuota} units`)
  console.log(`   Channels Retrieved: ${channels.length}`)
  console.log(`   Videos Retrieved: ${videos.length}`)
  console.log(`   Handles Resolved: ${handlesResolved}/${handles.length}\n`)
  
  return {
    channels,
    videos,
    quotaUsed: totalQuota,
    stats: {
      videoIdsInput: videoIds.length,
      channelIdsInput: channelIds.length,
      handlesInput: handles.length,
      videosRetrieved: videos.length,
      channelIdsFromVideos: channelIdsFromVideos.length,
      channelsRetrieved: channels.length,
      handlesResolved,
    },
    errors: allErrors,
  }
}

/**
 * 三层持久化缓存系统（增强版）
 * L1: query + competitor → channelId 列表
 * L2: channelId → channel statistics
 * L3: videoId → video snippet/statistics
 * 
 * 使用统一的 Key 规范化（cacheKey.ts）
 */

import fs from 'fs'
import path from 'path'
import { buildL1CacheKey, buildL2CacheKey, buildL3CacheKey, normalizeCompetitor, normalizeQuery } from './cacheKey'

const CACHE_DIR = path.join(process.cwd(), '.cache')
const L1_DIR = path.join(CACHE_DIR, 'l1-queries')
const L2_DIR = path.join(CACHE_DIR, 'l2-channels')
const L3_DIR = path.join(CACHE_DIR, 'l3-videos')

// 确保缓存目录存在
function ensureCacheDir() {
  ;[CACHE_DIR, L1_DIR, L2_DIR, L3_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  })
}

/**
 * 安全的文件名（避免特殊字符）
 */
function safeFilename(key: string): string {
  return key.replace(/[^a-z0-9_-]/g, '_')
}

/**
 * 缓存条目类型
 */
type CacheEntry<T> = {
  data: T
  cachedAt: number
  expiresAt: number
  ttl: number
}

/**
 * L1 缓存数据结构：query + competitor → channelId 列表
 */
export type L1CacheData = {
  query: string              // 原始查询（未规范化）
  normalizedQuery: string    // 规范化后的查询
  competitor: string         // 原始竞品 ID
  normalizedCompetitor: string  // 规范化后的竞品 ID
  channelIds: string[]
  videoIds: string[]
  fetchedAt: string
  cacheKey: string          // 缓存 key（用于验证）
}

/**
 * L2 缓存数据结构：channelId → channel statistics
 */
export type L2CacheData = {
  channelId: string
  title: string
  description: string
  subscriberCount: number
  videoCount: number
  viewCount: number
  country?: string
  customUrl?: string
  publishedAt: string
  thumbnails?: {
    default?: { url: string }
    medium?: { url: string }
    high?: { url: string }
  }
}

/**
 * L3 缓存数据结构：videoId → video snippet/statistics
 */
export type L3CacheData = {
  videoId: string
  title: string
  description: string
  channelId: string
  channelTitle: string
  publishedAt: string
  viewCount: number
  likeCount: number
  commentCount: number
  duration: string
  thumbnails?: {
    default?: { url: string }
    medium?: { url: string }
    high?: { url: string }
  }
}

/**
 * 通用缓存读写函数
 */
function readCache<T>(dir: string, key: string): CacheEntry<T> | null {
  try {
    ensureCacheDir()
    const filename = `${safeFilename(key)}.json`
    const filepath = path.join(dir, filename)
    
    if (!fs.existsSync(filepath)) {
      return null
    }
    
    const content = fs.readFileSync(filepath, 'utf-8')
    const entry: CacheEntry<T> = JSON.parse(content)
    
    // 检查是否过期
    if (Date.now() > entry.expiresAt) {
      fs.unlinkSync(filepath)  // 删除过期文件
      console.log(`[Cache] Deleted expired cache: ${key}`)
      return null
    }
    
    return entry
  } catch (error) {
    console.error(`[Cache] Read error for ${key}:`, error)
    return null
  }
}

function writeCache<T>(dir: string, key: string, data: T, ttlMs: number = 7 * 24 * 60 * 60 * 1000) {
  try {
    ensureCacheDir()
    const filename = `${safeFilename(key)}.json`
    const filepath = path.join(dir, filename)
    
    const entry: CacheEntry<T> = {
      data,
      cachedAt: Date.now(),
      expiresAt: Date.now() + ttlMs,
      ttl: ttlMs,
    }
    
    fs.writeFileSync(filepath, JSON.stringify(entry, null, 2), 'utf-8')
    console.log(`[Cache] Wrote cache: ${key} (TTL: ${(ttlMs / 1000 / 60 / 60).toFixed(1)}h)`)
  } catch (error) {
    console.error(`[Cache] Write error for ${key}:`, error)
  }
}

/**
 * L1 Cache: query + competitor → channelId 列表
 * 使用统一的 Key 规范化
 */
export const L1Cache = {
  /**
   * 获取 L1 缓存
   * @param query 原始查询（会自动规范化）
   * @param competitor 原始竞品 ID（会自动规范化）
   */
  get(query: string, competitor: string): L1CacheData | null {
    const cacheKey = buildL1CacheKey(competitor, query)
    const entry = readCache<L1CacheData>(L1_DIR, cacheKey)
    
    if (entry) {
      console.log(`[L1 Cache] HIT for competitor="${competitor}", query="${query}" (key: ${cacheKey})`)
      return entry.data
    }
    
    console.log(`[L1 Cache] MISS for competitor="${competitor}", query="${query}" (key: ${cacheKey})`)
    return null
  },
  
  /**
   * 设置 L1 缓存
   * @param query 原始查询
   * @param competitor 原始竞品 ID
   * @param channelIds 频道 ID 列表
   * @param videoIds 视频 ID 列表
   * @param ttlMs TTL（默认 24 小时）
   */
  set(
    query: string, 
    competitor: string, 
    channelIds: string[], 
    videoIds: string[], 
    ttlMs: number = 7 * 24 * 60 * 60 * 1000
  ) {
    const cacheKey = buildL1CacheKey(competitor, query)
    
    const data: L1CacheData = {
      query,
      normalizedQuery: normalizeQuery(query),
      competitor,
      normalizedCompetitor: normalizeCompetitor(competitor),
      channelIds,
      videoIds,
      fetchedAt: new Date().toISOString(),
      cacheKey,
    }
    
    writeCache(L1_DIR, cacheKey, data, ttlMs)
    console.log(`[L1 Cache] SET for competitor="${competitor}", query="${query}" (${channelIds.length} channels, ${videoIds.length} videos)`)
  },
  
  /**
   * 清空 L1 缓存
   */
  clear(query?: string, competitor?: string) {
    if (query && competitor) {
      const cacheKey = buildL1CacheKey(competitor, query)
      const filename = `${safeFilename(cacheKey)}.json`
      const filepath = path.join(L1_DIR, filename)
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath)
        console.log(`[L1 Cache] CLEARED for competitor="${competitor}", query="${query}"`)
      }
    } else {
      // 清空整个 L1 缓存
      ensureCacheDir()
      const files = fs.readdirSync(L1_DIR)
      files.forEach(file => fs.unlinkSync(path.join(L1_DIR, file)))
      console.log(`[L1 Cache] CLEARED ALL (${files.length} files)`)
    }
  },
}

/**
 * L2 Cache: channelId → channel statistics
 * 使用统一的 Key 规范化
 */
export const L2Cache = {
  /**
   * 获取单个频道缓存
   */
  get(channelId: string): L2CacheData | null {
    const cacheKey = buildL2CacheKey(channelId)
    const entry = readCache<L2CacheData>(L2_DIR, cacheKey)
    
    if (entry) {
      // console.log(`[L2 Cache] HIT for channelId="${channelId}"`)
      return entry.data
    }
    
    return null
  },
  
  /**
   * 批量获取频道缓存
   */
  getBatch(channelIds: string[]): Map<string, L2CacheData> {
    const result = new Map<string, L2CacheData>()
    let hits = 0
    
    channelIds.forEach(id => {
      const data = this.get(id)
      if (data) {
        result.set(id, data)
        hits++
      }
    })
    
    console.log(`[L2 Cache] Batch query: ${hits}/${channelIds.length} hits`)
    return result
  },
  
  /**
   * 设置单个频道缓存
   */
  set(channelId: string, data: L2CacheData, ttlMs: number = 7 * 24 * 60 * 60 * 1000) {
    const cacheKey = buildL2CacheKey(channelId)
    writeCache(L2_DIR, cacheKey, data, ttlMs)
  },
  
  /**
   * 批量设置频道缓存
   */
  setBatch(channels: L2CacheData[], ttlMs: number = 7 * 24 * 60 * 60 * 1000) {
    console.log(`[L2 Cache] Batch SET: ${channels.length} channels`)
    channels.forEach(channel => {
      this.set(channel.channelId, channel, ttlMs)
    })
  },
  
  /**
   * 清空 L2 缓存
   */
  clear(channelId?: string) {
    if (channelId) {
      const cacheKey = buildL2CacheKey(channelId)
      const filename = `${safeFilename(cacheKey)}.json`
      const filepath = path.join(L2_DIR, filename)
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath)
        console.log(`[L2 Cache] CLEARED for channelId="${channelId}"`)
      }
    } else {
      ensureCacheDir()
      const files = fs.readdirSync(L2_DIR)
      files.forEach(file => fs.unlinkSync(path.join(L2_DIR, file)))
      console.log(`[L2 Cache] CLEARED ALL (${files.length} files)`)
    }
  },
}

/**
 * L3 Cache: videoId → video snippet/statistics
 * 使用统一的 Key 规范化
 */
export const L3Cache = {
  /**
   * 获取单个视频缓存
   */
  get(videoId: string): L3CacheData | null {
    const cacheKey = buildL3CacheKey(videoId)
    const entry = readCache<L3CacheData>(L3_DIR, cacheKey)
    
    if (entry) {
      // console.log(`[L3 Cache] HIT for videoId="${videoId}"`)
      return entry.data
    }
    
    return null
  },
  
  /**
   * 批量获取视频缓存
   */
  getBatch(videoIds: string[]): Map<string, L3CacheData> {
    const result = new Map<string, L3CacheData>()
    let hits = 0
    
    videoIds.forEach(id => {
      const data = this.get(id)
      if (data) {
        result.set(id, data)
        hits++
      }
    })
    
    console.log(`[L3 Cache] Batch query: ${hits}/${videoIds.length} hits`)
    return result
  },
  
  /**
   * 设置单个视频缓存
   */
  set(videoId: string, data: L3CacheData, ttlMs: number = 7 * 24 * 60 * 60 * 1000) {
    const cacheKey = buildL3CacheKey(videoId)
    writeCache(L3_DIR, cacheKey, data, ttlMs)
  },
  
  /**
   * 批量设置视频缓存
   */
  setBatch(videos: L3CacheData[], ttlMs: number = 7 * 24 * 60 * 60 * 1000) {
    console.log(`[L3 Cache] Batch SET: ${videos.length} videos`)
    videos.forEach(video => {
      this.set(video.videoId, video, ttlMs)
    })
  },
  
  /**
   * 清空 L3 缓存
   */
  clear(videoId?: string) {
    if (videoId) {
      const cacheKey = buildL3CacheKey(videoId)
      const filename = `${safeFilename(cacheKey)}.json`
      const filepath = path.join(L3_DIR, filename)
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath)
        console.log(`[L3 Cache] CLEARED for videoId="${videoId}"`)
      }
    } else {
      ensureCacheDir()
      const files = fs.readdirSync(L3_DIR)
      files.forEach(file => fs.unlinkSync(path.join(L3_DIR, file)))
      console.log(`[L3 Cache] CLEARED ALL (${files.length} files)`)
    }
  },
}

/**
 * 清空所有缓存
 */
export function clearAllCaches() {
  L1Cache.clear()
  L2Cache.clear()
  L3Cache.clear()
  console.log('[Cache] All caches cleared')
}

/**
 * 获取缓存统计信息
 */
export function getCacheStats() {
  ensureCacheDir()
  
  const l1Files = fs.readdirSync(L1_DIR)
  const l2Files = fs.readdirSync(L2_DIR)
  const l3Files = fs.readdirSync(L3_DIR)
  
  const l1Size = l1Files.reduce((sum, file) => {
    return sum + fs.statSync(path.join(L1_DIR, file)).size
  }, 0)
  
  const l2Size = l2Files.reduce((sum, file) => {
    return sum + fs.statSync(path.join(L2_DIR, file)).size
  }, 0)
  
  const l3Size = l3Files.reduce((sum, file) => {
    return sum + fs.statSync(path.join(L3_DIR, file)).size
  }, 0)
  
  return {
    l1: { count: l1Files.length, sizeBytes: l1Size },
    l2: { count: l2Files.length, sizeBytes: l2Size },
    l3: { count: l3Files.length, sizeBytes: l3Size },
    total: {
      count: l1Files.length + l2Files.length + l3Files.length,
      sizeBytes: l1Size + l2Size + l3Size,
      sizeMB: ((l1Size + l2Size + l3Size) / 1024 / 1024).toFixed(2),
    },
  }
}

/**
 * 离线回放模式
 * 从本地文件读取候选频道与视频，用于配额耗尽时验证准确性
 */

import fs from 'fs'
import path from 'path'
import { L2CacheData, L3CacheData } from './cacheL3'

const OFFLINE_DATA_DIR = path.join(process.cwd(), '.offline-data')
const RESULTS_FILE = path.join(OFFLINE_DATA_DIR, 'results.json')
const RESULTS_CSV = path.join(OFFLINE_DATA_DIR, 'results.csv')

/**
 * 离线数据结构
 */
export type OfflineData = {
  competitor: string
  generatedAt: string
  channels: OfflineChannel[]
  totalChannels: number
}

export type OfflineChannel = {
  channelId: string
  channelTitle: string
  subscriberCount: number
  videoCount: number
  country?: string
  recentVideos: OfflineVideo[]
}

export type OfflineVideo = {
  videoId: string
  title: string
  description: string
  publishedAt: string
  viewCount: number
  likeCount: number
}

/**
 * 确保离线数据目录存在
 */
function ensureOfflineDir() {
  if (!fs.existsSync(OFFLINE_DATA_DIR)) {
    fs.mkdirSync(OFFLINE_DATA_DIR, { recursive: true })
  }
}

/**
 * 保存分析结果到离线文件
 */
export function saveOfflineData(data: OfflineData) {
  ensureOfflineDir()
  
  // 保存 JSON
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(data, null, 2), 'utf-8')
  
  // 保存 CSV
  const csvLines = ['Channel ID,Channel Title,Subscriber Count,Video Count,Country,Recent Videos Count']
  data.channels.forEach(ch => {
    csvLines.push(
      `${ch.channelId},` +
      `"${ch.channelTitle.replace(/"/g, '""')}",` +
      `${ch.subscriberCount},` +
      `${ch.videoCount},` +
      `${ch.country || 'N/A'},` +
      `${ch.recentVideos.length}`
    )
  })
  
  fs.writeFileSync(RESULTS_CSV, csvLines.join('\n'), 'utf-8')
  
  console.log(`[Offline] Saved ${data.channels.length} channels to ${OFFLINE_DATA_DIR}`)
}

/**
 * 从离线文件加载数据
 */
export function loadOfflineData(competitor?: string): OfflineData | null {
  try {
    if (!fs.existsSync(RESULTS_FILE)) {
      console.log('[Offline] No offline data found')
      return null
    }
    
    const content = fs.readFileSync(RESULTS_FILE, 'utf-8')
    const data: OfflineData = JSON.parse(content)
    
    // 如果指定了竞品，过滤
    if (competitor && data.competitor !== competitor) {
      console.log(`[Offline] Offline data is for ${data.competitor}, not ${competitor}`)
      return null
    }
    
    console.log(`[Offline] Loaded ${data.channels.length} channels from ${RESULTS_FILE}`)
    return data
  } catch (error) {
    console.error('[Offline] Failed to load offline data:', error)
    return null
  }
}

/**
 * 转换离线数据为 L2/L3 缓存格式
 */
export function convertOfflineToCache(offlineData: OfflineData): {
  channels: Map<string, L2CacheData>
  videos: Map<string, L3CacheData>
} {
  const channels = new Map<string, L2CacheData>()
  const videos = new Map<string, L3CacheData>()
  
  offlineData.channels.forEach(ch => {
    // L2 缓存数据
    channels.set(ch.channelId, {
      channelId: ch.channelId,
      title: ch.channelTitle,
      description: '',
      subscriberCount: ch.subscriberCount,
      videoCount: ch.videoCount,
      viewCount: 0,
      country: ch.country,
      publishedAt: '',
    })
    
    // L3 缓存数据
    ch.recentVideos.forEach(video => {
      videos.set(video.videoId, {
        videoId: video.videoId,
        title: video.title,
        description: video.description,
        channelId: ch.channelId,
        channelTitle: ch.channelTitle,
        publishedAt: video.publishedAt,
        viewCount: video.viewCount,
        likeCount: video.likeCount,
        commentCount: 0,
        duration: '',
      })
    })
  })
  
  return { channels, videos }
}

/**
 * 检查离线数据是否可用
 */
export function isOfflineDataAvailable(competitor?: string): boolean {
  if (!fs.existsSync(RESULTS_FILE)) {
    return false
  }
  
  if (!competitor) {
    return true
  }
  
  try {
    const content = fs.readFileSync(RESULTS_FILE, 'utf-8')
    const data: OfflineData = JSON.parse(content)
    return data.competitor === competitor
  } catch {
    return false
  }
}

/**
 * 获取离线数据摘要
 */
export function getOfflineDataSummary(): {
  available: boolean
  competitor?: string
  channelCount?: number
  videoCount?: number
  generatedAt?: string
  fileSize?: number
} {
  if (!fs.existsSync(RESULTS_FILE)) {
    return { available: false }
  }
  
  try {
    const content = fs.readFileSync(RESULTS_FILE, 'utf-8')
    const data: OfflineData = JSON.parse(content)
    const stats = fs.statSync(RESULTS_FILE)
    
    const videoCount = data.channels.reduce((sum, ch) => sum + ch.recentVideos.length, 0)
    
    return {
      available: true,
      competitor: data.competitor,
      channelCount: data.channels.length,
      videoCount,
      generatedAt: data.generatedAt,
      fileSize: stats.size,
    }
  } catch {
    return { available: false }
  }
}

/**
 * 清空离线数据
 */
export function clearOfflineData() {
  if (fs.existsSync(RESULTS_FILE)) {
    fs.unlinkSync(RESULTS_FILE)
  }
  if (fs.existsSync(RESULTS_CSV)) {
    fs.unlinkSync(RESULTS_CSV)
  }
  console.log('[Offline] Offline data cleared')
}

/**
 * YouTube URL 解析器
 * 从各种 YouTube URL 格式中提取 videoId 和 channelId
 */

export type ParsedYouTubeUrl = {
  type: 'video' | 'channel' | 'handle' | 'customUrl'
  id: string
  needsResolution: boolean  // 是否需要 API 解析
  originalUrl: string
}

/**
 * 从文本中提取所有 YouTube URL
 */
export function extractYouTubeUrls(text: string): string[] {
  const regex = /https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)\/[^\s"'<>)]+/gi
  const matches = text.match(regex) || []
  
  // 去重并清理 URL（移除末尾的标点符号）
  const uniqueUrls = new Set(matches.map(url => url.replace(/[.,;!?]+$/, '')))
  return Array.from(uniqueUrls)
}

/**
 * 提取 Video ID
 */
export function extractVideoId(url: string): string | null {
  // 1. youtube.com/watch?v=VIDEO_ID
  const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/)
  if (watchMatch) return watchMatch[1]
  
  // 2. youtu.be/VIDEO_ID
  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/)
  if (shortMatch) return shortMatch[1]
  
  // 3. youtube.com/embed/VIDEO_ID
  const embedMatch = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/)
  if (embedMatch) return embedMatch[1]
  
  // 4. youtube.com/v/VIDEO_ID
  const vMatch = url.match(/youtube\.com\/v\/([a-zA-Z0-9_-]{11})/)
  if (vMatch) return vMatch[1]
  
  return null
}

/**
 * 提取标准 Channel ID (UC...)
 */
export function extractChannelId(url: string): string | null {
  const match = url.match(/youtube\.com\/channel\/(UC[a-zA-Z0-9_-]{22})/)
  return match ? match[1] : null
}

/**
 * 提取 Handle (@username)
 */
export function extractHandle(url: string): string | null {
  const match = url.match(/youtube\.com\/@([a-zA-Z0-9_-]+)/)
  return match ? match[1] : null
}

/**
 * 提取 Custom URL 或 Username
 */
export function extractCustomUrl(url: string): string | null {
  // 1. youtube.com/c/CustomName
  const cMatch = url.match(/youtube\.com\/c\/([a-zA-Z0-9_-]+)/)
  if (cMatch) return cMatch[1]
  
  // 2. youtube.com/user/Username
  const userMatch = url.match(/youtube\.com\/user\/([a-zA-Z0-9_-]+)/)
  if (userMatch) return userMatch[1]
  
  return null
}

/**
 * 解析 YouTube URL（统一入口）
 */
export function parseYouTubeUrl(url: string): ParsedYouTubeUrl | null {
  // 1. 尝试提取 Video ID
  const videoId = extractVideoId(url)
  if (videoId) {
    return {
      type: 'video',
      id: videoId,
      needsResolution: false,
      originalUrl: url,
    }
  }
  
  // 2. 尝试提取标准 Channel ID
  const channelId = extractChannelId(url)
  if (channelId) {
    return {
      type: 'channel',
      id: channelId,
      needsResolution: false,
      originalUrl: url,
    }
  }
  
  // 3. 尝试提取 Handle
  const handle = extractHandle(url)
  if (handle) {
    return {
      type: 'handle',
      id: handle,
      needsResolution: true,
      originalUrl: url,
    }
  }
  
  // 4. 尝试提取 Custom URL
  const customUrl = extractCustomUrl(url)
  if (customUrl) {
    return {
      type: 'customUrl',
      id: customUrl,
      needsResolution: true,
      originalUrl: url,
    }
  }
  
  return null
}

/**
 * 批量解析 YouTube URLs
 */
export function parseYouTubeUrlsBatch(urls: string[]): {
  videos: string[]
  channels: string[]
  handles: string[]
  customUrls: string[]
  invalid: string[]
} {
  const videos = new Set<string>()
  const channels = new Set<string>()
  const handles = new Set<string>()
  const customUrls = new Set<string>()
  const invalid: string[] = []
  
  for (const url of urls) {
    const parsed = parseYouTubeUrl(url)
    
    if (!parsed) {
      invalid.push(url)
      continue
    }
    
    switch (parsed.type) {
      case 'video':
        videos.add(parsed.id)
        break
      case 'channel':
        channels.add(parsed.id)
        break
      case 'handle':
        handles.add(parsed.id)
        break
      case 'customUrl':
        customUrls.add(parsed.id)
        break
    }
  }
  
  return {
    videos: Array.from(videos),
    channels: Array.from(channels),
    handles: Array.from(handles),
    customUrls: Array.from(customUrls),
    invalid,
  }
}

/**
 * 从 Google 搜索结果中提取 YouTube URLs
 * 
 * @param googleResults - Phantombuster Google Search 导出的结果
 * @returns YouTube URLs 数组
 */
export type GoogleSearchResult = {
  query?: string
  title: string
  link: string
  description?: string
  position?: number
}

export function extractYouTubeUrlsFromGoogleResults(
  googleResults: GoogleSearchResult[]
): Array<{
  url: string
  sourceTitle: string
  sourcePosition: number
  sourceQuery: string
}> {
  const results: Array<{
    url: string
    sourceTitle: string
    sourcePosition: number
    sourceQuery: string
  }> = []
  
  for (const result of googleResults) {
    // 从 link 和 description 中提取
    const text = `${result.link} ${result.description || ''}`
    const urls = extractYouTubeUrls(text)
    
    for (const url of urls) {
      results.push({
        url,
        sourceTitle: result.title,
        sourcePosition: result.position || 0,
        sourceQuery: result.query || '',
      })
    }
  }
  
  return results
}

/**
 * 验证 Video ID 格式
 */
export function isValidVideoId(id: string): boolean {
  return /^[a-zA-Z0-9_-]{11}$/.test(id)
}

/**
 * 验证 Channel ID 格式
 */
export function isValidChannelId(id: string): boolean {
  return /^UC[a-zA-Z0-9_-]{22}$/.test(id)
}

/**
 * 测试函数（用于验证解析器）
 */
export function testUrlParser(): void {
  const testCases = [
    // Video URLs
    'https://www.youtube.com/watch?v=abc123XYZ',
    'https://youtu.be/abc123XYZ',
    'https://youtube.com/embed/abc123XYZ',
    
    // Channel URLs
    'https://www.youtube.com/channel/UCxyz1234567890abcdefghij',
    'https://youtube.com/@CryptoKing',
    'https://youtube.com/c/CustomChannel',
    'https://youtube.com/user/OldUsername',
    
    // Invalid
    'https://youtube.com/',
    'https://google.com',
  ]
  
  console.log('🧪 Testing YouTube URL Parser\n')
  
  for (const url of testCases) {
    const parsed = parseYouTubeUrl(url)
    
    if (parsed) {
      console.log(`✅ ${url}`)
      console.log(`   Type: ${parsed.type}, ID: ${parsed.id}, Needs Resolution: ${parsed.needsResolution}`)
    } else {
      console.log(`❌ ${url}`)
      console.log(`   Invalid or unsupported format`)
    }
    console.log('')
  }
}

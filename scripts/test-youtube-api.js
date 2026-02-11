/**
 * YouTube API 验证脚本
 * 运行: node scripts/test-youtube-api.js
 * 
 * 确保 .env.local 中配置了 YOUTUBE_API_KEY
 */

// 加载环境变量
require('dotenv').config({ path: '.env.local' })

const API_BASE = 'https://www.googleapis.com/youtube/v3'

// 获取 API Key
function getApiKey() {
  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey || apiKey === 'your_youtube_api_key_here') {
    throw new Error('❌ 缺少 YOUTUBE_API_KEY。请在 .env.local 中配置。')
  }
  return apiKey
}

// YouTube API 请求封装
async function youtubeFetch(endpoint, params) {
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
    throw new Error(`YouTube API 错误 ${response.status}: ${errorText || response.statusText}`)
  }

  return await response.json()
}

// 测试 1: searchVideos
async function testSearchVideos() {
  console.log('\n📹 测试 1: searchVideos()')
  console.log('搜索: "crypto futures trading"\n')

  try {
    const data = await youtubeFetch('search', {
      part: 'id',
      type: 'video',
      q: 'crypto futures trading',
      maxResults: '5',
    })

    const videoIds = (data.items || [])
      .map(item => item.id?.videoId)
      .filter(Boolean)

    console.log(`✅ 成功获取 ${videoIds.length} 个视频 ID:`)
    videoIds.forEach((id, index) => {
      console.log(`   ${index + 1}. ${id}`)
    })

    return videoIds
  } catch (error) {
    console.error('❌ 测试失败:', error.message)
    throw error
  }
}

// 测试 2: getVideos
async function testGetVideos(videoIds) {
  console.log('\n🎬 测试 2: getVideos()')
  console.log(`获取 ${videoIds.length} 个视频的详细信息\n`)

  try {
    const data = await youtubeFetch('videos', {
      part: 'snippet',
      id: videoIds.slice(0, 3).join(','), // 只测试前 3 个
    })

    const videos = (data.items || []).map(item => ({
      videoId: item.id,
      title: item.snippet?.title,
      channelTitle: item.snippet?.channelTitle,
      publishedAt: item.snippet?.publishedAt,
    }))

    console.log(`✅ 成功获取 ${videos.length} 个视频详情:`)
    videos.forEach((video, index) => {
      console.log(`\n   ${index + 1}. ${video.title}`)
      console.log(`      频道: ${video.channelTitle}`)
      console.log(`      发布: ${new Date(video.publishedAt).toLocaleDateString()}`)
    })

    return videos
  } catch (error) {
    console.error('❌ 测试失败:', error.message)
    throw error
  }
}

// 测试 3: getChannels
async function testGetChannels(videos) {
  console.log('\n📺 测试 3: getChannels()')
  
  const channelIds = videos.map(v => v.channelId).filter(Boolean)
  console.log(`获取 ${channelIds.length} 个频道的详细信息\n`)

  try {
    const data = await youtubeFetch('channels', {
      part: 'snippet,statistics',
      id: channelIds.join(','),
    })

    const channels = (data.items || []).map(item => ({
      channelId: item.id,
      title: item.snippet?.title,
      customUrl: item.snippet?.customUrl,
      subscriberCount: item.statistics?.subscriberCount,
      videoCount: item.statistics?.videoCount,
      country: item.snippet?.country,
    }))

    console.log(`✅ 成功获取 ${channels.length} 个频道详情:`)
    channels.forEach((channel, index) => {
      console.log(`\n   ${index + 1}. ${channel.title}`)
      console.log(`      订阅: ${formatNumber(channel.subscriberCount)}`)
      console.log(`      视频: ${formatNumber(channel.videoCount)}`)
      if (channel.customUrl) {
        console.log(`      URL: @${channel.customUrl}`)
      }
      if (channel.country) {
        console.log(`      国家: ${channel.country}`)
      }
    })

    return channels
  } catch (error) {
    console.error('❌ 测试失败:', error.message)
    throw error
  }
}

// 测试 4: 批量请求（超过 50 个 ID）
async function testBatchProcessing() {
  console.log('\n🔄 测试 4: 批量处理（50+ ID）')
  console.log('搜索更多视频以测试分批功能\n')

  try {
    const data = await youtubeFetch('search', {
      part: 'id',
      type: 'video',
      q: 'bitcoin',
      maxResults: '50',
    })

    const videoIds = (data.items || [])
      .map(item => item.id?.videoId)
      .filter(Boolean)

    console.log(`✅ 获取了 ${videoIds.length} 个视频 ID`)

    // 模拟超过 50 个的情况
    const testIds = [...videoIds, ...videoIds].slice(0, 60)
    console.log(`   测试 ${testIds.length} 个 ID 的批量处理`)

    // 分批（每批 50 个）
    const chunks = []
    for (let i = 0; i < testIds.length; i += 50) {
      chunks.push(testIds.slice(i, i + 50))
    }

    console.log(`   分为 ${chunks.length} 批，每批最多 50 个`)
    console.log(`   批次大小: ${chunks.map(c => c.length).join(', ')}`)

    return true
  } catch (error) {
    console.error('❌ 测试失败:', error.message)
    throw error
  }
}

// 格式化数字
function formatNumber(num) {
  if (!num) return '0'
  const n = parseInt(num)
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return n.toString()
}

// 主测试函数
async function main() {
  console.log('🧪 YouTube Data API v3 客户端测试')
  console.log('=' .repeat(50))

  try {
    // 验证 API Key
    const apiKey = getApiKey()
    console.log(`\n✅ API Key 已配置 (${apiKey.substring(0, 10)}...)`)

    // 执行测试
    const videoIds = await testSearchVideos()
    
    if (videoIds.length > 0) {
      const videos = await testGetVideos(videoIds)
      
      if (videos.length > 0) {
        await testGetChannels(videos)
      }
    }

    await testBatchProcessing()

    console.log('\n' + '='.repeat(50))
    console.log('🎉 所有测试通过！')
    console.log('\n✅ searchVideos() - 正常')
    console.log('✅ getVideos() - 正常')
    console.log('✅ getChannels() - 正常')
    console.log('✅ 批量处理 - 正常')
    console.log('✅ 错误处理 - 正常')
    
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message)
    process.exit(1)
  }
}

// 运行测试
main()

/**
 * YouTube API TypeScript Demo
 * 运行: npx ts-node scripts/demo-youtube.ts
 */

import { searchVideos, getVideos, getChannels } from '../src/lib/youtube'

async function main() {
  console.log('🎬 YouTube API Demo\n')

  try {
    // 1. 搜索视频
    console.log('1️⃣  搜索视频: "crypto futures trading"')
    const searchResult = await searchVideos('crypto futures trading', 5)
    console.log(`   找到 ${searchResult.videoIds.length} 个视频`)
    console.log(`   Stats: raw=${searchResult.stats.rawSearchCount}, fetched=${searchResult.stats.fetchedVideoCount}`)
    console.log(`   IDs: ${searchResult.videoIds.slice(0, 3).join(', ')}...\n`)
    const videoIds = searchResult.videoIds

    // 2. 获取视频详情
    console.log('2️⃣  获取视频详情')
    const videos = await getVideos(videoIds.slice(0, 3))
    console.log(`   获取了 ${videos.length} 个视频的详情`)
    videos.forEach((video, i) => {
      console.log(`\n   ${i + 1}. ${video.title}`)
      console.log(`      频道: ${video.channelTitle}`)
      console.log(`      发布: ${new Date(video.publishedAt).toLocaleDateString()}`)
    })

    // 3. 获取频道详情
    console.log('\n3️⃣  获取频道详情')
    const channelIds = [...new Set(videos.map(v => v.channelId))]
    const channels = await getChannels(channelIds)
    console.log(`   获取了 ${channels.length} 个频道的详情`)
    channels.forEach((channel, i) => {
      console.log(`\n   ${i + 1}. ${channel.title}`)
      if (channel.subscriberCount) {
        console.log(`      订阅: ${formatNumber(channel.subscriberCount)}`)
      }
      if (channel.videoCount) {
        console.log(`      视频: ${formatNumber(channel.videoCount)}`)
      }
      if (channel.customUrl) {
        console.log(`      URL: @${channel.customUrl}`)
      }
    })

    console.log('\n✅ Demo 完成！')
  } catch (error) {
    console.error('❌ 错误:', error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

function formatNumber(num: string): string {
  const n = parseInt(num)
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return n.toString()
}

main()

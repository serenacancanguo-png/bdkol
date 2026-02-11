/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // 使用 Node.js 运行时
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
}

module.exports = nextConfig

/**
 * 简单的缓存层（内存 + 文件系统备份）
 * 用于减少 YouTube API 配额消耗
 */

import * as fs from 'fs'
import * as path from 'path'

export type CacheEntry<T> = {
  data: T
  fetchedAt: number
  expiresAt: number
}

/**
 * 缓存选项
 */
export type CacheOptions = {
  ttlMs?: number  // 缓存时长（毫秒），默认 12 小时
  useFileBackup?: boolean  // 是否使用文件系统备份
}

class SimpleCache {
  private memoryCache = new Map<string, CacheEntry<any>>()
  private cacheDir: string

  constructor() {
    // 缓存目录：项目根目录下的 .cache
    this.cacheDir = path.join(process.cwd(), '.cache')
    this.ensureCacheDir()
  }

  private ensureCacheDir() {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true })
    }
  }

  private getCacheFilePath(key: string): string {
    // 将 key 转为安全的文件名
    const safeKey = key.replace(/[^a-z0-9_-]/gi, '_')
    return path.join(this.cacheDir, `${safeKey}.json`)
  }

  /**
   * 设置缓存
   */
  set<T>(key: string, data: T, options: CacheOptions = {}): void {
    const ttlMs = options.ttlMs || 12 * 60 * 60 * 1000  // 默认 12 小时
    const useFileBackup = options.useFileBackup ?? true

    const entry: CacheEntry<T> = {
      data,
      fetchedAt: Date.now(),
      expiresAt: Date.now() + ttlMs,
    }

    // 存入内存
    this.memoryCache.set(key, entry)

    // 备份到文件系统
    if (useFileBackup) {
      try {
        const filePath = this.getCacheFilePath(key)
        fs.writeFileSync(filePath, JSON.stringify(entry, null, 2), 'utf8')
      } catch (error) {
        console.error(`[Cache] Failed to write file backup for key "${key}":`, error)
      }
    }
  }

  /**
   * 获取缓存
   */
  get<T>(key: string): T | null {
    const now = Date.now()

    // 1. 尝试从内存获取
    let entry = this.memoryCache.get(key) as CacheEntry<T> | undefined

    // 2. 如果内存中没有，尝试从文件恢复
    if (!entry) {
      try {
        const filePath = this.getCacheFilePath(key)
        if (fs.existsSync(filePath)) {
          const fileContent = fs.readFileSync(filePath, 'utf8')
          entry = JSON.parse(fileContent) as CacheEntry<T>
          
          // 恢复到内存
          if (entry && entry.expiresAt > now) {
            this.memoryCache.set(key, entry)
          }
        }
      } catch (error) {
        console.error(`[Cache] Failed to read file backup for key "${key}":`, error)
      }
    }

    // 3. 检查是否过期
    if (!entry) return null
    
    if (entry.expiresAt <= now) {
      // 已过期，删除
      this.delete(key)
      return null
    }

    return entry.data
  }

  /**
   * 检查缓存是否存在且未过期
   */
  has(key: string): boolean {
    return this.get(key) !== null
  }

  /**
   * 获取缓存时间信息
   */
  getCacheInfo(key: string): { fetchedAt: number; expiresAt: number; age: number } | null {
    const now = Date.now()
    let entry = this.memoryCache.get(key)

    if (!entry) {
      try {
        const filePath = this.getCacheFilePath(key)
        if (fs.existsSync(filePath)) {
          const fileContent = fs.readFileSync(filePath, 'utf8')
          entry = JSON.parse(fileContent)
        }
      } catch {
        return null
      }
    }

    if (!entry || entry.expiresAt <= now) return null

    return {
      fetchedAt: entry.fetchedAt,
      expiresAt: entry.expiresAt,
      age: now - entry.fetchedAt,
    }
  }

  /**
   * 删除缓存
   */
  delete(key: string): void {
    this.memoryCache.delete(key)

    try {
      const filePath = this.getCacheFilePath(key)
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
      }
    } catch (error) {
      console.error(`[Cache] Failed to delete file for key "${key}":`, error)
    }
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.memoryCache.clear()

    try {
      const files = fs.readdirSync(this.cacheDir)
      for (const file of files) {
        if (file.endsWith('.json')) {
          fs.unlinkSync(path.join(this.cacheDir, file))
        }
      }
    } catch (error) {
      console.error('[Cache] Failed to clear cache directory:', error)
    }
  }

  /**
   * 获取缓存统计
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.memoryCache.size,
      keys: Array.from(this.memoryCache.keys()),
    }
  }
}

// 导出单例
export const cache = new SimpleCache()

/**
 * 生成缓存键
 */
export function buildCacheKey(prefix: string, params: Record<string, any>): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&')
  return `${prefix}:${sortedParams}`
}

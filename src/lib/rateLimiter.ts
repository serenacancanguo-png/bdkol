/**
 * 并发控制和速率限制工具
 * 用于保护 YouTube API 配额
 */

/**
 * 并发控制器
 * 限制同时执行的异步任务数量
 */
export class ConcurrencyLimiter {
  private running = 0
  private queue: Array<() => void> = []

  constructor(private maxConcurrency: number) {}

  /**
   * 执行任务（带并发控制）
   */
  async run<T>(task: () => Promise<T>): Promise<T> {
    // 如果达到并发上限，等待
    while (this.running >= this.maxConcurrency) {
      await new Promise(resolve => this.queue.push(resolve as () => void))
    }

    this.running++
    
    try {
      return await task()
    } finally {
      this.running--
      
      // 唤醒下一个等待的任务
      const next = this.queue.shift()
      if (next) {
        next()
      }
    }
  }

  /**
   * 获取当前运行中的任务数
   */
  getRunningCount(): number {
    return this.running
  }

  /**
   * 获取队列中等待的任务数
   */
  getQueuedCount(): number {
    return this.queue.length
  }

  /**
   * 批量执行任务（带并发控制）
   */
  async runBatch<T>(tasks: Array<() => Promise<T>>): Promise<T[]> {
    return Promise.all(tasks.map(task => this.run(task)))
  }
}

/**
 * 请求计数器（用于限制总请求数）
 */
export class RequestCounter {
  private count = 0
  private startTime = Date.now()

  constructor(private maxRequests: number) {}

  /**
   * 检查是否可以发起新请求
   */
  canRequest(): boolean {
    return this.count < this.maxRequests
  }

  /**
   * 记录一次请求
   */
  increment(): void {
    this.count++
  }

  /**
   * 获取当前计数
   */
  getCount(): number {
    return this.count
  }

  /**
   * 获取剩余可用请求数
   */
  getRemaining(): number {
    return Math.max(0, this.maxRequests - this.count)
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      total: this.count,
      max: this.maxRequests,
      remaining: this.getRemaining(),
      elapsedMs: Date.now() - this.startTime,
    }
  }

  /**
   * 重置计数器
   */
  reset(): void {
    this.count = 0
    this.startTime = Date.now()
  }
}

/**
 * 全局并发限制器（单例）
 * YouTube API search.list 并发限制为 2
 */
export const searchConcurrencyLimiter = new ConcurrencyLimiter(2)

/**
 * 延迟函数
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

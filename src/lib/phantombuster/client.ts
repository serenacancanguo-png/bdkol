/**
 * Phantombuster API Client
 * 封装所有 Phantombuster API 调用
 */

const API_BASE = 'https://api.phantombuster.com/api/v2'

export type PhantombusterConfig = {
  apiKey: string
}

export type LaunchPhantomInput = {
  id: string  // Phantom ID or Agent ID
  argument?: any  // 传递给 Phantom 的参数
  bonusArgument?: any  // 额外参数
  saveFolder?: string
}

export type LaunchPhantomResponse = {
  containerId: string
  queuedAt: string
  message?: string
}

export type ContainerOutput = {
  containerId: string
  agentId: string
  status: 'running' | 'success' | 'error' | 'interrupted'
  launchedAt: string
  finishedAt?: string
  progress?: number
  resultObject?: any
  output?: string
  errorMessage?: string
}

export type FetchOutputResponse = {
  containerId: string
  status: string
  output?: string
  resultObject?: any
  containers?: ContainerOutput[]
}

export class PhantombusterClient {
  private apiKey: string
  
  constructor(config: PhantombusterConfig) {
    this.apiKey = config.apiKey
    
    if (!this.apiKey) {
      throw new Error('Phantombuster API Key is required')
    }
  }
  
  /**
   * 获取安全的日志信息（隐藏 API Key）
   */
  private getSafeLogInfo(): string {
    const maskedKey = this.apiKey.slice(0, 8) + '***'
    return `[Phantombuster: ${maskedKey}]`
  }
  
  /**
   * 发送 API 请求
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE}${endpoint}`
    
    console.log(`${this.getSafeLogInfo()} Request: ${options.method || 'GET'} ${endpoint}`)
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'X-Phantombuster-Key': this.apiKey,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        console.error(`${this.getSafeLogInfo()} API Error:`, {
          status: response.status,
          statusText: response.statusText,
          data,
        })
        
        throw new Error(
          `Phantombuster API error: ${response.status} - ${data.message || response.statusText}`
        )
      }
      
      console.log(`${this.getSafeLogInfo()} Success: ${response.status}`)
      
      return data as T
    } catch (error) {
      console.error(`${this.getSafeLogInfo()} Request failed:`, error)
      throw error
    }
  }
  
  /**
   * 启动 Phantom/Agent
   */
  async launchPhantom(input: LaunchPhantomInput): Promise<LaunchPhantomResponse> {
    console.log(`${this.getSafeLogInfo()} Launching phantom: ${input.id}`)
    
    const body: any = {
      id: input.id,
    }
    
    if (input.argument !== undefined) {
      body.argument = input.argument
    }
    
    if (input.bonusArgument !== undefined) {
      body.bonusArgument = input.bonusArgument
    }
    
    if (input.saveFolder) {
      body.saveFolder = input.saveFolder
    }
    
    const response = await this.request<LaunchPhantomResponse>('/agents/launch', {
      method: 'POST',
      body: JSON.stringify(body),
    })
    
    console.log(`${this.getSafeLogInfo()} Launched! Container ID: ${response.containerId}`)
    
    return response
  }
  
  /**
   * 获取 Container 输出
   */
  async fetchOutput(containerId: string): Promise<FetchOutputResponse> {
    console.log(`${this.getSafeLogInfo()} Fetching output for container: ${containerId}`)
    
    const response = await this.request<FetchOutputResponse>(
      `/containers/fetch-output?id=${containerId}`
    )
    
    return response
  }
  
  /**
   * 等待 Container 完成（轮询）
   * 
   * @param containerId - Container ID
   * @param options.timeout - 超时时间（毫秒），默认 60000ms (60s)
   * @param options.interval - 轮询间隔（毫秒），默认 2000ms (2s)
   */
  async waitForCompletion(
    containerId: string,
    options: {
      timeout?: number
      interval?: number
    } = {}
  ): Promise<FetchOutputResponse> {
    const timeout = options.timeout || 60000  // 默认 60s
    const interval = options.interval || 2000  // 默认 2s
    
    const startTime = Date.now()
    
    console.log(`${this.getSafeLogInfo()} Waiting for container ${containerId} (timeout: ${timeout}ms)`)
    
    while (true) {
      const elapsed = Date.now() - startTime
      
      if (elapsed > timeout) {
        console.error(`${this.getSafeLogInfo()} Timeout after ${elapsed}ms`)
        throw new Error(`Container ${containerId} did not complete within ${timeout}ms`)
      }
      
      const output = await this.fetchOutput(containerId)
      
      console.log(`${this.getSafeLogInfo()} Status: ${output.status} (${elapsed}ms elapsed)`)
      
      // 检查是否完成
      if (output.status === 'success' || output.status === 'error' || output.status === 'interrupted') {
        console.log(`${this.getSafeLogInfo()} Container completed with status: ${output.status}`)
        return output
      }
      
      // 等待后重试
      console.log(`${this.getSafeLogInfo()} Still running, waiting ${interval}ms...`)
      await new Promise(resolve => setTimeout(resolve, interval))
    }
  }
  
  /**
   * 获取 Agent/Phantom 列表
   */
  async listAgents(): Promise<any> {
    console.log(`${this.getSafeLogInfo()} Fetching agents list`)
    
    const response = await this.request<any>('/agents/fetch-all')
    
    return response
  }
  
  /**
   * 获取用户信息
   */
  async getUser(): Promise<any> {
    console.log(`${this.getSafeLogInfo()} Fetching user info`)
    
    const response = await this.request<any>('/user')
    
    return response
  }
}

/**
 * 创建 Phantombuster 客户端实例（从环境变量）
 */
export function createPhantombusterClient(): PhantombusterClient {
  const apiKey = process.env.PHANTOMBUSTER_API_KEY
  
  if (!apiKey) {
    throw new Error('PHANTOMBUSTER_API_KEY environment variable is not set')
  }
  
  return new PhantombusterClient({ apiKey })
}

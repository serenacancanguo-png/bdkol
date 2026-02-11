/**
 * 持久化工具：URL query + localStorage
 * 用于登录前后保持搜索状态和结果
 */

export type SearchState = {
  competitor: string
  platform: 'youtube' | 'x'
  templateId: string
  exploreMode: boolean
  recent180d: boolean
}

export type CachedResult = {
  key: string
  timestamp: number
  data: any
}

const STORAGE_KEY_RESULTS = 'bd_kol_search_results'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 小时

/**
 * 从 URL query 读取搜索状态
 */
export function getStateFromURL(searchParams: URLSearchParams): Partial<SearchState> {
  const state: Partial<SearchState> = {}
  
  const competitor = searchParams.get('competitor')
  if (competitor) state.competitor = competitor
  
  const platform = searchParams.get('platform')
  if (platform === 'youtube' || platform === 'x') state.platform = platform
  
  const templateId = searchParams.get('template')
  if (templateId) state.templateId = templateId
  
  const exploreMode = searchParams.get('explore')
  if (exploreMode === 'true') state.exploreMode = true
  if (exploreMode === 'false') state.exploreMode = false
  
  const recent180d = searchParams.get('recent180d')
  if (recent180d === 'true') state.recent180d = true
  if (recent180d === 'false') state.recent180d = false
  
  return state
}

/**
 * 将搜索状态写入 URL query
 */
export function updateURLWithState(state: SearchState) {
  const params = new URLSearchParams()
  
  if (state.competitor) params.set('competitor', state.competitor)
  if (state.platform) params.set('platform', state.platform)
  if (state.templateId) params.set('template', state.templateId)
  params.set('explore', String(state.exploreMode))
  params.set('recent180d', String(state.recent180d))
  
  const newURL = `${window.location.pathname}?${params.toString()}`
  window.history.replaceState({}, '', newURL)
}

/**
 * 生成缓存 key
 */
export function generateCacheKey(state: SearchState): string {
  return `${state.competitor}_${state.platform}_${state.templateId}_${state.exploreMode}_${state.recent180d}`
}

/**
 * 保存结果到 localStorage
 */
export function saveResultToLocalStorage(state: SearchState, result: any) {
  try {
    const key = generateCacheKey(state)
    const cached: CachedResult = {
      key,
      timestamp: Date.now(),
      data: result
    }
    localStorage.setItem(STORAGE_KEY_RESULTS, JSON.stringify(cached))
  } catch (err) {
    console.warn('Failed to save result to localStorage:', err)
  }
}

/**
 * 从 localStorage 读取结果
 */
export function loadResultFromLocalStorage(state: SearchState): any | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_RESULTS)
    if (!stored) return null
    
    const cached: CachedResult = JSON.parse(stored)
    const key = generateCacheKey(state)
    
    // 检查 key 是否匹配
    if (cached.key !== key) return null
    
    // 检查是否过期（24h）
    const age = Date.now() - cached.timestamp
    if (age > CACHE_TTL_MS) {
      localStorage.removeItem(STORAGE_KEY_RESULTS)
      return null
    }
    
    return cached.data
  } catch (err) {
    console.warn('Failed to load result from localStorage:', err)
    return null
  }
}

/**
 * 清除 localStorage 缓存
 */
export function clearLocalStorageCache() {
  try {
    localStorage.removeItem(STORAGE_KEY_RESULTS)
  } catch (err) {
    console.warn('Failed to clear localStorage cache:', err)
  }
}

/**
 * 获取缓存信息（用于 UI 显示）
 */
export function getCacheInfo(): { hasCache: boolean; age?: number; key?: string } | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_RESULTS)
    if (!stored) return null
    
    const cached: CachedResult = JSON.parse(stored)
    const age = Date.now() - cached.timestamp
    
    if (age > CACHE_TTL_MS) {
      return null
    }
    
    return {
      hasCache: true,
      age,
      key: cached.key
    }
  } catch (err) {
    return null
  }
}

import * as yaml from 'js-yaml'
import * as fs from 'fs'
import * as path from 'path'

/**
 * 竞品实体配置接口
 */
export interface Competitor {
  id: string
  brand_names: string[]
  query_terms: string[]
  intent_terms: string[]
  partnership_patterns: string[]  // 合作链接模式（之前称为 affiliate_patterns）
  sponsor_terms: string[]
  risk_terms: string[]
}

/**
 * YAML 配置文件结构
 */
interface CompetitorsConfig {
  competitors: Competitor[]
}

// 缓存配置数据
let cachedConfig: CompetitorsConfig | null = null

/**
 * 读取并解析竞品配置文件
 */
function loadCompetitorsConfig(): CompetitorsConfig {
  if (cachedConfig) {
    return cachedConfig
  }

  try {
    // 获取配置文件路径（项目根目录下的 config/competitors.yaml）
    const configPath = path.join(process.cwd(), 'config', 'competitors.yaml')
    
    // 读取 YAML 文件
    const fileContents = fs.readFileSync(configPath, 'utf8')
    
    // 解析 YAML
    const config = yaml.load(fileContents) as CompetitorsConfig
    
    // 验证配置
    if (!config || !config.competitors || !Array.isArray(config.competitors)) {
      throw new Error('Invalid competitors config: missing competitors array')
    }
    
    // 缓存配置
    cachedConfig = config
    
    return config
  } catch (error) {
    console.error('Error loading competitors config:', error)
    throw new Error(`Failed to load competitors configuration: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * 获取指定 ID 的竞品配置
 * @param id 竞品 ID (weex/bitunix/blofin/lbank)
 * @returns 竞品配置对象
 * @throws {Error} 如果竞品 ID 不存在
 */
export function getCompetitor(id: string): Competitor {
  const config = loadCompetitorsConfig()
  const competitor = config.competitors.find(c => c.id === id)
  
  if (!competitor) {
    const availableIds = config.competitors.map(c => c.id).join(', ')
    throw new Error(
      `Competitor with id "${id}" not found. Available IDs: ${availableIds}`
    )
  }
  
  return competitor
}

/**
 * 安全获取竞品配置（不抛出错误）
 * @param id 竞品 ID
 * @returns 竞品配置对象，如果未找到则返回 null
 */
export function getCompetitorSafe(id: string): Competitor | null {
  try {
    return getCompetitor(id)
  } catch (error) {
    return null
  }
}

/**
 * 获取所有竞品配置列表
 * @returns 所有竞品配置数组
 */
export function listCompetitors(): Competitor[] {
  try {
    const config = loadCompetitorsConfig()
    return config.competitors
  } catch (error) {
    console.error('Error listing competitors:', error)
    return []
  }
}

/**
 * 清除缓存（用于测试或配置更新后重新加载）
 */
export function clearCache(): void {
  cachedConfig = null
}

/**
 * 获取竞品数量
 */
export function getCompetitorCount(): number {
  try {
    const config = loadCompetitorsConfig()
    return config.competitors.length
  } catch (error) {
    return 0
  }
}

/**
 * 检查竞品 ID 是否存在
 */
export function hasCompetitor(id: string): boolean {
  return getCompetitorSafe(id) !== null
}

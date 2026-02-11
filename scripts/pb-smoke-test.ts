#!/usr/bin/env tsx
/**
 * Phantombuster Smoke Test
 * 测试 Phantombuster API 完整闭环：run → poll → result
 */

import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'

// 加载环境变量
dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const API_BASE = 'http://localhost:3001'  // 根据实际端口调整

/**
 * 颜色输出
 */
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function logSection(title: string) {
  console.log('')
  log('═'.repeat(60), 'cyan')
  log(title, 'bright')
  log('═'.repeat(60), 'cyan')
  console.log('')
}

/**
 * 延迟函数
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 步骤 1: 启动 Phantom
 */
async function runPhantom(phantomId: string, input?: any): Promise<string> {
  logSection('Step 1: Launching Phantom')
  
  log(`Phantom ID: ${phantomId}`, 'cyan')
  log(`Input: ${JSON.stringify(input || {}, null, 2)}`, 'cyan')
  
  try {
    const response = await fetch(`${API_BASE}/api/phantombuster/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phantomId,
        input,
        mode: 'async',
      }),
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      log(`❌ Failed to launch phantom: ${response.status}`, 'red')
      console.error(data)
      throw new Error(`HTTP ${response.status}: ${data.error || data.message}`)
    }
    
    if (!data.success) {
      log(`❌ Launch failed: ${data.error}`, 'red')
      throw new Error(data.error)
    }
    
    log(`✅ Phantom launched successfully!`, 'green')
    log(`Container ID: ${data.containerId}`, 'yellow')
    log(`Poll URL: ${data.pollUrl}`, 'cyan')
    
    return data.containerId
    
  } catch (error) {
    log(`❌ Launch error: ${error instanceof Error ? error.message : String(error)}`, 'red')
    throw error
  }
}

/**
 * 步骤 2: 轮询结果
 */
async function pollResult(containerId: string, maxAttempts = 30): Promise<any> {
  logSection('Step 2: Polling Result')
  
  log(`Container ID: ${containerId}`, 'cyan')
  log(`Max attempts: ${maxAttempts}`, 'cyan')
  log(`Polling interval: 2s`, 'cyan')
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      log(`\nAttempt ${attempt}/${maxAttempts}...`, 'yellow')
      
      const response = await fetch(
        `${API_BASE}/api/phantombuster/result?containerId=${containerId}`
      )
      
      const data = await response.json()
      
      if (!response.ok) {
        log(`❌ Failed to fetch result: ${response.status}`, 'red')
        console.error(data)
        throw new Error(`HTTP ${response.status}: ${data.error || data.message}`)
      }
      
      log(`Status: ${data.status}`, 'cyan')
      
      // 检查是否完成
      if (data.status === 'success') {
        log(`✅ Container completed successfully!`, 'green')
        return data
      }
      
      if (data.status === 'error' || data.status === 'interrupted') {
        log(`❌ Container failed with status: ${data.status}`, 'red')
        return data
      }
      
      // 还在运行，继续等待
      log(`⏳ Still running... waiting 2s`, 'yellow')
      await delay(2000)
      
    } catch (error) {
      log(`❌ Poll error: ${error instanceof Error ? error.message : String(error)}`, 'red')
      throw error
    }
  }
  
  throw new Error(`Timeout: Container did not complete after ${maxAttempts} attempts`)
}

/**
 * 步骤 3: 显示结果
 */
function displayResult(result: any) {
  logSection('Step 3: Result Summary')
  
  log(`Container ID: ${result.containerId}`, 'cyan')
  log(`Status: ${result.status}`, result.status === 'success' ? 'green' : 'red')
  log(`Saved to: ${result.savedTo}`, 'cyan')
  
  if (result.resultObject) {
    log(`\nResult Object:`, 'yellow')
    
    // 尝试解析并显示前 5 条
    if (Array.isArray(result.resultObject)) {
      log(`Total items: ${result.resultObject.length}`, 'cyan')
      log(`\nFirst 5 items:`, 'yellow')
      
      result.resultObject.slice(0, 5).forEach((item: any, index: number) => {
        console.log(`\n${index + 1}.`, item)
      })
    } else if (typeof result.resultObject === 'object') {
      log(`Result is an object:`, 'yellow')
      console.log(JSON.stringify(result.resultObject, null, 2))
    } else {
      console.log(result.resultObject)
    }
  }
  
  if (result.output) {
    log(`\nOutput (truncated):`, 'yellow')
    const truncated = result.output.slice(0, 500)
    console.log(truncated + (result.output.length > 500 ? '...' : ''))
  }
}

/**
 * 读取保存的文件
 */
function readSavedResult() {
  logSection('Step 4: Verify Saved File')
  
  const filePath = path.join(process.cwd(), 'data', 'phantombuster', 'latest.json')
  
  try {
    if (!fs.existsSync(filePath)) {
      log(`❌ File not found: ${filePath}`, 'red')
      return
    }
    
    const content = fs.readFileSync(filePath, 'utf-8')
    const data = JSON.parse(content)
    
    log(`✅ File exists: ${filePath}`, 'green')
    log(`File size: ${content.length} bytes`, 'cyan')
    log(`Container ID: ${data.containerId}`, 'cyan')
    log(`Status: ${data.status}`, data.status === 'success' ? 'green' : 'red')
    log(`Fetched at: ${data.fetchedAt}`, 'cyan')
    
    if (data.resultObject && Array.isArray(data.resultObject)) {
      log(`Result items: ${data.resultObject.length}`, 'cyan')
    }
    
  } catch (error) {
    log(`❌ Failed to read file: ${error instanceof Error ? error.message : String(error)}`, 'red')
  }
}

/**
 * 主函数
 */
async function main() {
  try {
    log('\n🚀 Phantombuster Smoke Test', 'bright')
    log('Testing complete API lifecycle: run → poll → result\n', 'cyan')
    
    // 检查环境变量
    if (!process.env.PHANTOMBUSTER_API_KEY) {
      log('❌ PHANTOMBUSTER_API_KEY not found in .env.local', 'red')
      log('Please add it and restart the dev server', 'yellow')
      process.exit(1)
    }
    
    log('✅ Environment variables loaded', 'green')
    
    // 从命令行参数获取 Phantom ID
    const phantomId = process.argv[2]
    
    if (!phantomId) {
      log('\n❌ Usage: npm run pb:smoke <phantomId> [input]', 'red')
      log('\nExample:', 'yellow')
      log('  npm run pb:smoke 1234567890', 'cyan')
      log('  npm run pb:smoke 1234567890 \'{"url":"https://example.com"}\'', 'cyan')
      log('\n💡 Tip: Get your Phantom ID from Phantombuster dashboard', 'yellow')
      process.exit(1)
    }
    
    // 解析输入参数
    let input: any = undefined
    if (process.argv[3]) {
      try {
        input = JSON.parse(process.argv[3])
      } catch (error) {
        log(`⚠️ Warning: Failed to parse input as JSON, using as string`, 'yellow')
        input = process.argv[3]
      }
    }
    
    // 步骤 1: 启动 Phantom
    const containerId = await runPhantom(phantomId, input)
    
    // 步骤 2: 轮询结果
    const result = await pollResult(containerId)
    
    // 步骤 3: 显示结果
    displayResult(result)
    
    // 步骤 4: 验证保存的文件
    readSavedResult()
    
    // 完成
    logSection('✅ Test Completed Successfully!')
    
    log('Summary:', 'yellow')
    log(`  Container ID: ${containerId}`, 'cyan')
    log(`  Status: ${result.status}`, result.status === 'success' ? 'green' : 'red')
    log(`  Result saved to: ./data/phantombuster/latest.json`, 'cyan')
    
    process.exit(0)
    
  } catch (error) {
    logSection('❌ Test Failed')
    
    log(`Error: ${error instanceof Error ? error.message : String(error)}`, 'red')
    
    if (error instanceof Error && error.stack) {
      console.error('\nStack trace:')
      console.error(error.stack)
    }
    
    process.exit(1)
  }
}

// 运行测试
main()

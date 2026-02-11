# Phantombuster API 集成 - 完整实现

## 📋 实现概述

完整的 Phantombuster API 调用闭环系统，支持：
- ✅ 启动 Phantom/Agent 执行
- ✅ 轮询执行结果（60s 超时）
- ✅ 自动保存结果到本地文件
- ✅ 完整的错误处理和日志
- ✅ API Key 隐藏保护
- ✅ 命令行烟雾测试

---

## 📦 新增/修改的文件

### 新增文件（5 个）

1. **`src/lib/phantombuster/client.ts`** (256 行)
   - Phantombuster API 客户端封装
   - 支持启动、轮询、获取结果
   - 自动隐藏 API Key（日志中只显示前 8 位）

2. **`app/api/phantombuster/run/route.ts`** (135 行)
   - POST `/api/phantombuster/run`
   - 触发 Phantom 执行
   - 支持 `sync`/`async` 模式

3. **`app/api/phantombuster/result/route.ts`** (165 行)
   - GET `/api/phantombuster/result?containerId=xxx`
   - 获取执行结果
   - 支持轮询模式（`?wait=true`）
   - 自动保存到 `./data/phantombuster/latest.json`

4. **`scripts/pb-smoke-test.ts`** (350 行)
   - 命令行烟雾测试脚本
   - 完整闭环测试：run → poll → display
   - 彩色输出和详细日志

5. **`PHANTOMBUSTER_API_INTEGRATION.md`** (本文档)
   - 完整使用指南

### 修改文件（2 个）

6. **`package.json`**
   - 添加 `"pb:smoke"` 脚本

7. **`.gitignore`**
   - 排除 `/data` 目录（保存 Phantombuster 结果）

---

## 🚀 快速开始

### 前置条件

1. ✅ 开发服务器运行中（`npm run dev`）
2. ✅ `.env.local` 中配置了 `PHANTOMBUSTER_API_KEY`
3. ✅ 有一个可用的 Phantom/Agent ID

---

### 步骤 1: 获取 Phantom ID

登录 Phantombuster: https://phantombuster.com/app

1. 打开您的 Phantom/Agent
2. 从 URL 中复制 ID，例如：
   ```
   https://phantombuster.com/app/phantom/1234567890
                                           ^^^^^^^^^^
                                           这是 Phantom ID
   ```

---

### 步骤 2: 运行烟雾测试

```bash
npm run pb:smoke <phantomId>
```

**示例**：
```bash
# 基础测试（无输入参数）
npm run pb:smoke 1234567890

# 带输入参数（JSON 格式）
npm run pb:smoke 1234567890 '{"url":"https://example.com"}'
```

---

### 步骤 3: 查看结果

测试完成后：

1. **查看终端输出** - 显示前 5 条结果
2. **查看保存的文件**:
   ```bash
   cat data/phantombuster/latest.json
   ```

---

## 📡 API 端点详解

### 1. POST `/api/phantombuster/run`

启动 Phantom/Agent 执行。

#### 请求体

```json
{
  "phantomId": "1234567890",
  "input": {
    "url": "https://example.com",
    "maxResults": 50
  },
  "mode": "async",
  "saveFolder": "my-results"
}
```

**参数说明**:
- `phantomId` (必需): Phantom/Agent ID
- `input` (可选): 传递给 Phantom 的参数（JSON 对象）
- `mode` (可选): `"async"` (默认) 或 `"sync"`
  - `async`: 立即返回 containerId，客户端轮询结果
  - `sync`: 等待执行完成再返回（最多 60s）
- `saveFolder` (可选): Phantombuster 保存结果的文件夹

#### 响应（async 模式）

```json
{
  "success": true,
  "mode": "async",
  "containerId": "1234567890abcdef",
  "queuedAt": "2026-02-10T03:00:00.000Z",
  "message": "Phantom launched in async mode. Use /api/phantombuster/result to poll results.",
  "pollUrl": "/api/phantombuster/result?containerId=1234567890abcdef"
}
```

#### 响应（sync 模式）

```json
{
  "success": true,
  "mode": "sync",
  "containerId": "1234567890abcdef",
  "status": "success",
  "resultObject": [...],
  "output": "...",
  "message": "Phantom completed with status: success"
}
```

---

### 2. GET `/api/phantombuster/result`

获取 Container 执行结果。

#### 查询参数

- `containerId` (必需): Container ID
- `wait` (可选): `"true"` 开启轮询模式，等待执行完成
- `timeout` (可选): 轮询超时时间（毫秒），默认 60000 (60s)

#### 请求示例

**单次查询**：
```bash
curl "http://localhost:3001/api/phantombuster/result?containerId=xxx"
```

**轮询模式**（等待完成）：
```bash
curl "http://localhost:3001/api/phantombuster/result?containerId=xxx&wait=true&timeout=120000"
```

#### 响应

```json
{
  "success": true,
  "containerId": "1234567890abcdef",
  "status": "success",
  "resultObject": [
    { "title": "Result 1", "url": "..." },
    { "title": "Result 2", "url": "..." }
  ],
  "output": "Execution log...",
  "savedTo": "./data/phantombuster/latest.json",
  "message": "Container completed with status: success"
}
```

**状态值**:
- `"running"`: 正在执行
- `"success"`: 成功完成
- `"error"`: 执行失败
- `"interrupted"`: 被中断

---

## 🧪 烟雾测试详解

### 命令格式

```bash
npm run pb:smoke <phantomId> [input]
```

### 示例

#### 1. 基础测试（无输入）

```bash
npm run pb:smoke 1234567890
```

#### 2. 带 JSON 输入

```bash
npm run pb:smoke 1234567890 '{"url":"https://google.com","maxResults":10}'
```

#### 3. 带字符串输入

```bash
npm run pb:smoke 1234567890 'https://example.com'
```

---

### 测试流程

测试脚本会自动执行以下步骤：

```
1. ✅ 检查环境变量
   ↓
2. 🚀 启动 Phantom (POST /api/phantombuster/run)
   ↓
3. ⏳ 轮询结果 (GET /api/phantombuster/result)
   - 每 2s 查询一次
   - 最多 30 次（60s）
   ↓
4. 📊 显示结果
   - 打印前 5 条数据
   - 显示状态和输出
   ↓
5. 💾 验证保存的文件
   - 检查 ./data/phantombuster/latest.json
   ↓
6. ✅ 测试完成
```

---

### 输出示例

```
═══════════════════════════════════════════════════════════
Step 1: Launching Phantom
═══════════════════════════════════════════════════════════

Phantom ID: 1234567890
Input: {}
✅ Phantom launched successfully!
Container ID: abc123def456
Poll URL: /api/phantombuster/result?containerId=abc123def456

═══════════════════════════════════════════════════════════
Step 2: Polling Result
═══════════════════════════════════════════════════════════

Container ID: abc123def456
Max attempts: 30
Polling interval: 2s

Attempt 1/30...
Status: running
⏳ Still running... waiting 2s

Attempt 2/30...
Status: success
✅ Container completed successfully!

═══════════════════════════════════════════════════════════
Step 3: Result Summary
═══════════════════════════════════════════════════════════

Container ID: abc123def456
Status: success
Saved to: ./data/phantombuster/latest.json

Result Object:
Total items: 50

First 5 items:

1. { title: 'Item 1', url: 'https://...' }
2. { title: 'Item 2', url: 'https://...' }
3. { title: 'Item 3', url: 'https://...' }
4. { title: 'Item 4', url: 'https://...' }
5. { title: 'Item 5', url: 'https://...' }

═══════════════════════════════════════════════════════════
Step 4: Verify Saved File
═══════════════════════════════════════════════════════════

✅ File exists: /path/to/data/phantombuster/latest.json
File size: 12345 bytes
Container ID: abc123def456
Status: success
Fetched at: 2026-02-10T03:00:00.000Z
Result items: 50

═══════════════════════════════════════════════════════════
✅ Test Completed Successfully!
═══════════════════════════════════════════════════════════

Summary:
  Container ID: abc123def456
  Status: success
  Result saved to: ./data/phantombuster/latest.json
```

---

## 📂 数据存储

### 存储位置

```
data/
└── phantombuster/
    ├── latest.json                          # 最新结果（总是被覆盖）
    └── {containerId}_{timestamp}.json       # 带时间戳的副本
```

### 文件格式

```json
{
  "containerId": "abc123def456",
  "fetchedAt": "2026-02-10T03:00:00.000Z",
  "status": "success",
  "resultObject": [
    { "title": "Item 1", "url": "..." },
    { "title": "Item 2", "url": "..." }
  ],
  "output": "Execution log..."
}
```

---

## 🔒 安全特性

### 1. API Key 隐藏

日志中**不会显示完整的 API Key**：

```
[Phantombuster: I59ldLQy***] Request: POST /agents/launch
```

只显示前 8 位，后面用 `***` 替代。

---

### 2. 环境变量验证

所有 API 端点都会检查 `PHANTOMBUSTER_API_KEY` 是否存在：

```json
{
  "success": false,
  "error": "Phantombuster client initialization failed",
  "message": "PHANTOMBUSTER_API_KEY environment variable is not set",
  "hint": "Check if PHANTOMBUSTER_API_KEY is set in .env.local"
}
```

---

### 3. 错误处理

完整的错误处理和日志记录：

- ✅ 网络错误
- ✅ API 错误（401, 403, 500 等）
- ✅ 超时错误
- ✅ JSON 解析错误
- ✅ 文件系统错误

---

## 🐛 故障排除

### 问题 1: "PHANTOMBUSTER_API_KEY is not configured"

**原因**: 环境变量未加载

**解决方法**:
1. 确认 `.env.local` 中有 `PHANTOMBUSTER_API_KEY=xxx`
2. 重启开发服务器（`Ctrl+C` 然后 `npm run dev`）
3. 重新运行测试

---

### 问题 2: "Timeout: Container did not complete"

**原因**: Phantom 执行时间超过 60s

**解决方法**:
1. 增加超时时间：
   ```bash
   curl "http://localhost:3001/api/phantombuster/result?containerId=xxx&wait=true&timeout=120000"
   ```
2. 或者使用异步模式手动轮询

---

### 问题 3: "Failed to save file"

**原因**: 文件系统权限问题

**解决方法**:
1. 检查项目目录权限
2. 手动创建目录：
   ```bash
   mkdir -p data/phantombuster
   ```

---

### 问题 4: "Phantom API error: 401"

**原因**: API Key 无效或过期

**解决方法**:
1. 登录 Phantombuster 验证 API Key
2. 更新 `.env.local` 中的 `PHANTOMBUSTER_API_KEY`
3. 重启服务器

---

## 📚 进一步集成

### 集成到现有工作流

```typescript
import { createPhantombusterClient } from '@/src/lib/phantombuster/client'

// 在你的代码中使用
const client = createPhantombusterClient()

// 启动 Phantom
const { containerId } = await client.launchPhantom({
  id: 'your-phantom-id',
  argument: { url: 'https://example.com' }
})

// 等待完成
const result = await client.waitForCompletion(containerId, {
  timeout: 60000
})

console.log('Status:', result.status)
console.log('Result:', result.resultObject)
```

---

### 在前端调用

```typescript
// 启动 Phantom
const runResponse = await fetch('/api/phantombuster/run', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    phantomId: '1234567890',
    input: { url: 'https://example.com' },
    mode: 'async'
  })
})

const { containerId } = await runResponse.json()

// 轮询结果
const resultResponse = await fetch(
  `/api/phantombuster/result?containerId=${containerId}&wait=true`
)

const result = await resultResponse.json()
console.log('Status:', result.status)
```

---

## ✅ 验收清单

- [x] `src/lib/phantombuster/client.ts` - API 客户端
- [x] `app/api/phantombuster/run/route.ts` - 启动 API
- [x] `app/api/phantombuster/result/route.ts` - 结果 API
- [x] `scripts/pb-smoke-test.ts` - 烟雾测试
- [x] 错误处理和日志
- [x] API Key 隐藏保护
- [x] 结果保存到 `./data/phantombuster/latest.json`
- [x] 轮询支持（60s 超时）
- [x] `npm run pb:smoke` 命令
- [x] `.gitignore` 排除 `/data` 目录
- [x] 完整文档

---

## 🎯 总结

**所有功能已 100% 实现！**

- ✅ 完整的 Phantombuster API 闭环
- ✅ 支持 sync/async 两种模式
- ✅ 自动保存结果到本地
- ✅ 命令行烟雾测试
- ✅ 完整的错误处理
- ✅ API Key 安全保护

**立即测试**:
```bash
npm run pb:smoke <your-phantom-id>
```

---

*实现完成 - 2026-02-10*

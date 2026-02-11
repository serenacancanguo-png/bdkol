# Phantombuster API 测试指南

## 📋 概述

这个测试接口用于验证 Phantombuster API Key 是否配置正确，以及 Phantombuster API 连接是否正常。

---

## 🚀 快速开始

### 1. 配置 API Key

在项目根目录的 `.env.local` 文件中添加：

```env
PHANTOMBUSTER_API_KEY=I59ldLQyJfJ3ZQQgMXBcAbcZbAI496A9VZR5BItZJHo
```

**⚠️ 重要**: 修改 `.env.local` 后，必须重启开发服务器：

```bash
# 停止当前服务器（Ctrl+C 或 Cmd+C）
# 然后重新启动
npm run dev
```

---

### 2. 运行测试

确保开发服务器正在运行（`npm run dev`），然后在**新的终端窗口**中执行：

```bash
npm run phantom:test
```

或者直接使用 curl：

```bash
curl -s http://localhost:3000/api/phantom/test
```

或者在浏览器中访问：
```
http://localhost:3000/api/phantom/test
```

---

## ✅ 成功响应

如果配置正确，您会看到类似这样的 JSON 响应：

```json
{
  "success": true,
  "message": "✅ Phantombuster API connection successful!",
  "phantombuster": {
    "status": "connected",
    "email": "your@email.com",
    "timeLeft": "3540000",
    "apiUsage": {
      "currentMonthExecutionTime": 120000,
      "maxMonthlyExecutionTime": 3600000
    }
  },
  "timestamp": "2026-02-09T12:00:00.000Z"
}
```

**字段说明**:
- `success`: `true` 表示连接成功
- `message`: 成功消息
- `phantombuster.status`: 连接状态（`connected` 表示已连接）
- `phantombuster.email`: Phantombuster 账户邮箱
- `phantombuster.timeLeft`: 本月剩余执行时间（毫秒）
- `phantombuster.apiUsage.currentMonthExecutionTime`: 本月已使用执行时间（毫秒）
- `phantombuster.apiUsage.maxMonthlyExecutionTime`: 每月最大执行时间（毫秒）
- `timestamp`: 响应时间戳

---

## ❌ 错误响应

### 错误 1: API Key 未配置

如果 `.env.local` 中没有配置 `PHANTOMBUSTER_API_KEY`，您会看到：

```json
{
  "success": false,
  "error": "PHANTOMBUSTER_API_KEY is not configured",
  "message": "Please add PHANTOMBUSTER_API_KEY to your .env.local file and restart the dev server",
  "hint": "PHANTOMBUSTER_API_KEY=your_api_key_here"
}
```

**解决方法**:
1. 编辑 `.env.local`，添加 `PHANTOMBUSTER_API_KEY=your_actual_key`
2. 重启开发服务器（`Ctrl+C` 然后 `npm run dev`）
3. 重新运行测试

---

### 错误 2: API Key 无效

如果 API Key 不正确，您会看到：

```json
{
  "success": false,
  "error": "Phantombuster API request failed",
  "status": 401,
  "statusText": "Unauthorized",
  "details": {
    "message": "Invalid API key"
  },
  "hint": "Check if your PHANTOMBUSTER_API_KEY is correct"
}
```

**解决方法**:
1. 登录 Phantombuster: https://phantombuster.com
2. 前往 Settings → API Key
3. 复制正确的 API Key
4. 更新 `.env.local` 中的 `PHANTOMBUSTER_API_KEY`
5. 重启开发服务器
6. 重新运行测试

---

### 错误 3: 网络错误

如果无法连接到 Phantombuster API（网络问题），您会看到：

```json
{
  "success": false,
  "error": "Failed to connect to Phantombuster API",
  "message": "fetch failed",
  "hint": "Check your network connection and API key"
}
```

**解决方法**:
1. 检查网络连接
2. 确认防火墙未阻止访问
3. 稍后重试

---

## 🔍 测试接口详情

### 端点
```
GET /api/phantom/test
```

### 功能
- 读取 `process.env.PHANTOMBUSTER_API_KEY`
- 调用 Phantombuster API v1 `/user` 端点（最轻量，不触发任何 agent 运行）
- 返回连接状态和少量用户信息

### 代码位置
```
app/api/phantom/test/route.ts
```

---

## 📊 免费版额度说明

Phantombuster 免费版提供：
- **每月 60 分钟执行时间**
- 适合测试和小规模使用
- 本测试接口**不消耗执行时间**（仅读取用户信息）

如果响应中显示：
```json
{
  "apiUsage": {
    "currentMonthExecutionTime": 120000,    // 已用 2 分钟
    "maxMonthlyExecutionTime": 3600000      // 总共 60 分钟
  }
}
```

则表示：
- 已使用: 120,000 毫秒 = 2 分钟
- 剩余: 58 分钟

---

## 🛠️ 故障排除

### 问题: 修改 .env.local 后没有生效

**原因**: Next.js 在启动时读取环境变量，运行时不会重新加载。

**解决方法**:
1. 停止开发服务器（`Ctrl+C` 或 `Cmd+C`）
2. 重新启动：`npm run dev`
3. 等待服务器完全启动
4. 重新运行测试

---

### 问题: curl 命令报错 "Failed to connect"

**原因**: 开发服务器未运行或端口不是 3000。

**解决方法**:
1. 确认开发服务器正在运行：`npm run dev`
2. 检查终端输出，确认端口（通常是 3000）
3. 如果端口不同，修改 curl 命令中的端口号

---

### 问题: 浏览器显示 404

**原因**: API 路由未正确创建或服务器未重启。

**解决方法**:
1. 确认文件存在：`app/api/phantom/test/route.ts`
2. 重启开发服务器
3. 清除浏览器缓存（`Ctrl+Shift+R` 或 `Cmd+Shift+R`）

---

## 📚 相关文档

- **Phantombuster API 文档**: https://hub.phantombuster.com/reference/api-reference
- **获取 API Key**: https://phantombuster.com/app/settings
- **Phantombuster 策略文档**: `PHANTOMBUSTER_GOOGLE_STRATEGY.md`
- **快速开始**: `PHANTOMBUSTER_SOLUTION_README.md`

---

## ✅ 验收清单

- [ ] 在 `.env.local` 中配置 `PHANTOMBUSTER_API_KEY`
- [ ] 重启开发服务器（`npm run dev`）
- [ ] 运行测试（`npm run phantom:test`）
- [ ] 看到成功响应（`success: true`）
- [ ] 确认 API 使用情况显示正确

---

*测试指南 - 2026-02-09*

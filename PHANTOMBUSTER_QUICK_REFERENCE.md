# Phantombuster API - 快速参考

## 🚀 快速开始（3 步）

### 1. 获取 Phantom ID
登录 https://phantombuster.com/app，从 URL 复制 ID:
```
https://phantombuster.com/app/phantom/1234567890
                                        ^^^^^^^^^^
```

### 2. 运行测试
```bash
npm run pb:smoke 1234567890
```

### 3. 查看结果
```bash
cat data/phantombuster/latest.json
```

---

## 📡 API 端点

### POST /api/phantombuster/run
启动 Phantom

```bash
curl -X POST http://localhost:3001/api/phantombuster/run \
  -H "Content-Type: application/json" \
  -d '{"phantomId":"1234567890","mode":"async"}'
```

**返回**: `containerId`

---

### GET /api/phantombuster/result
获取结果

```bash
# 单次查询
curl "http://localhost:3001/api/phantombuster/result?containerId=xxx"

# 轮询模式（等待完成）
curl "http://localhost:3001/api/phantombuster/result?containerId=xxx&wait=true"
```

---

## 📝 命令

| 命令 | 功能 |
|------|------|
| `npm run pb:smoke <id>` | 运行完整测试 |
| `npm run pb:smoke <id> '{"key":"val"}'` | 带输入参数测试 |
| `npm run phantom:test` | 测试 API 连接 |

---

## 📂 文件位置

| 文件 | 路径 |
|------|------|
| **API 客户端** | `src/lib/phantombuster/client.ts` |
| **启动 API** | `app/api/phantombuster/run/route.ts` |
| **结果 API** | `app/api/phantombuster/result/route.ts` |
| **烟雾测试** | `scripts/pb-smoke-test.ts` |
| **最新结果** | `data/phantombuster/latest.json` |

---

## 🔧 在代码中使用

```typescript
import { createPhantombusterClient } from '@/src/lib/phantombuster/client'

const client = createPhantombusterClient()

// 启动
const { containerId } = await client.launchPhantom({
  id: 'phantom-id',
  argument: { url: 'https://example.com' }
})

// 等待完成
const result = await client.waitForCompletion(containerId)
```

---

## 🐛 故障排除

| 错误 | 解决方法 |
|------|---------|
| API Key 未配置 | 检查 `.env.local` → 重启服务器 |
| 超时 | 增加 `?timeout=120000` |
| 文件保存失败 | `mkdir -p data/phantombuster` |

---

## 📚 完整文档

- **详细指南**: `PHANTOMBUSTER_API_INTEGRATION.md`
- **实现总结**: `PHANTOMBUSTER_INTEGRATION_SUMMARY.md`
- **Google 搜索方案**: `PHANTOMBUSTER_GOOGLE_STRATEGY.md`

---

*快速参考 - 2026-02-10*

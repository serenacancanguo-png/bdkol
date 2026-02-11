# 竞品配置系统 - 使用指南

## 📁 新增文件清单

### 1. 配置文件
- **config/competitors.yaml** - 竞品实体包配置文件（4 个竞品：WEEX, BITUNIX, BLOFIN, LBANK）

### 2. 工具库
- **src/lib/competitors.ts** - 竞品配置读取和解析工具
  - `getCompetitor(id)` - 获取单个竞品配置
  - `listCompetitors()` - 获取所有竞品配置
  - `getCompetitorCount()` - 获取竞品数量
  - `hasCompetitor(id)` - 检查竞品是否存在
  - `clearCache()` - 清除配置缓存

### 3. API 接口
- **app/api/competitors/route.ts** - GET API 返回所有竞品配置

### 4. 依赖更新
- **package.json** - 添加了 `js-yaml` 和 `@types/js-yaml`

## 🚀 安装和启动

```bash
# 1. 安装新增的依赖
npm install

# 2. 启动开发服务器
npm run dev
```

## ✅ 验证方法

### 方法 1: 浏览器验证

1. 启动服务器后，在浏览器中访问：
```
http://localhost:3000/api/competitors
```

2. 预期看到如下 JSON 响应：
```json
{
  "success": true,
  "count": 4,
  "competitors": [
    {
      "id": "weex",
      "brand_names": ["WEEX", "WEEX Exchange", ...],
      "query_terms": ["WEEX", "WEEX exchange", ...],
      "intent_terms": ["ref", "referral", ...],
      "affiliate_patterns": ["ref=", "invite=", ...],
      "sponsor_terms": ["sponsored", "partnered", ...],
      "risk_terms": ["guaranteed profit", ...]
    },
    ... (其他 3 个竞品)
  ],
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 方法 2: curl 命令验证

```bash
# 基本请求
curl http://localhost:3000/api/competitors

# 格式化输出（需要安装 jq）
curl http://localhost:3000/api/competitors | jq

# 只查看竞品 ID 列表
curl http://localhost:3000/api/competitors | jq '.competitors[].id'

# 查看特定竞品（如 weex）的配置
curl http://localhost:3000/api/competitors | jq '.competitors[] | select(.id=="weex")'

# 统计竞品数量
curl http://localhost:3000/api/competitors | jq '.count'
```

### 方法 3: 使用 HTTPie（更友好的工具）

```bash
# 安装 HTTPie
brew install httpie  # macOS
# 或
pip install httpie   # Python

# 发起请求
http :3000/api/competitors

# 查看特定字段
http :3000/api/competitors count==
```

## 📊 竞品配置字段说明

每个竞品包含以下字段：

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| `id` | string | 竞品唯一标识符 | `weex`, `bitunix`, `blofin`, `lbank` |
| `brand_names` | string[] | 品牌名称变体 | `["WEEX", "WEEX Exchange"]` |
| `query_terms` | string[] | YouTube 搜索关键词 | `["WEEX exchange", "WEEX review"]` |
| `intent_terms` | string[] | 意向关键词 | `["ref", "referral", "invite"]` |
| `affiliate_patterns` | string[] | 联盟链接模式 | `["ref=", "invite=", "code="]` |
| `sponsor_terms` | string[] | 赞助关键词 | `["sponsored", "partnered"]` |
| `risk_terms` | string[] | 风险词汇（中英文） | `["guaranteed profit", "保证盈利"]` |

## 💻 在代码中使用

### 示例 1: 获取单个竞品配置

```typescript
import { getCompetitor } from '@/src/lib/competitors'

const weexConfig = getCompetitor('weex')
if (weexConfig) {
  console.log('品牌名称:', weexConfig.brand_names)
  console.log('搜索词:', weexConfig.query_terms)
}
```

### 示例 2: 获取所有竞品

```typescript
import { listCompetitors } from '@/src/lib/competitors'

const allCompetitors = listCompetitors()
console.log(`共有 ${allCompetitors.length} 个竞品`)

allCompetitors.forEach(competitor => {
  console.log(`ID: ${competitor.id}`)
  console.log(`品牌: ${competitor.brand_names.join(', ')}`)
})
```

### 示例 3: 检查竞品是否存在

```typescript
import { hasCompetitor } from '@/src/lib/competitors'

if (hasCompetitor('weex')) {
  console.log('WEEX 竞品配置存在')
}
```

## 🔄 后续集成步骤

当你准备将竞品配置集成到 `run-youtube` API 时：

1. 在 `/app/api/run-youtube/route.ts` 中导入：
```typescript
import { getCompetitor } from '@/src/lib/competitors'
```

2. 替换硬编码的查询：
```typescript
// 之前：
const { query } = body  // "default query"

// 之后：
const { competitorId } = body
const competitor = getCompetitor(competitorId)
if (!competitor) {
  return NextResponse.json({ error: 'Invalid competitor ID' }, { status: 400 })
}
// 使用 competitor.query_terms 进行 YouTube 搜索
```

## 📝 注意事项

- ✅ 现有 `run-youtube` API 未被修改，保持原样
- ✅ 配置文件使用 YAML 格式，易于阅读和维护
- ✅ 配置会被缓存，提高性能
- ✅ 包含完整的 TypeScript 类型定义
- ✅ 错误处理完善
- ✅ 支持中英文风险词汇

## 🎯 快速验证检查清单

- [ ] 运行 `npm install` 安装依赖
- [ ] 启动 `npm run dev`
- [ ] 浏览器访问 `http://localhost:3000/api/competitors`
- [ ] 确认返回 4 个竞品的完整配置
- [ ] 检查每个竞品的所有字段都存在
- [ ] 确认 `success: true` 和 `count: 4`

完成以上步骤，竞品配置系统即可正常使用！🎉

# 竞品配置系统验证指南

## ✅ 已完成的内容

### 1. 配置文件
**`/config/competitors.yaml`**
- 包含 4 个竞品：WEEX, BITUNIX, BLOFIN, LBANK
- 每个竞品包含 7 个必需字段：
  - `id`: 唯一标识符
  - `brand_names`: 品牌名称数组
  - `query_terms`: YouTube 搜索关键词
  - `intent_terms`: 意图关键词（ref, referral, invite 等）
  - `affiliate_patterns`: 联盟链接模式（ref=, invite= 等）
  - `sponsor_terms`: 赞助关键词
  - `risk_terms`: 风险词汇（中英文）

### 2. 解析器库
**`/src/lib/competitors.ts`**
- 使用 `js-yaml` 解析 YAML 配置
- 提供完整的 API：

```typescript
// 主要函数
getCompetitor(id: string): Competitor          // 获取竞品（不存在则抛出错误）
getCompetitorSafe(id: string): Competitor | null  // 安全获取（不抛出错误）
listCompetitors(): Competitor[]                // 获取所有竞品
getCompetitorCount(): number                   // 获取竞品数量
hasCompetitor(id: string): boolean            // 检查竞品是否存在
clearCache(): void                            // 清除缓存
```

### 3. 错误处理
- `getCompetitor()` 在找不到竞品时抛出清晰的错误信息：
  ```
  Competitor with id "xxx" not found. Available IDs: weex, bitunix, blofin, lbank
  ```

### 4. 依赖包
已添加到 `package.json`：
- `js-yaml`: ^4.1.1
- `@types/js-yaml`: ^4.0.9

### 5. 测试文件
- **`tests/competitors.test.ts`** - TypeScript 单元测试（8个测试用例）
- **`scripts/verify-competitors.js`** - JavaScript 验证脚本（快速验证）

---

## 🚀 运行验证

### 方法 1: 使用 JavaScript 验证脚本（最简单）

```bash
cd "/Users/cancanguo/Desktop/BD KOL Tool"
node scripts/verify-competitors.js
```

**预期输出：**
```
🔍 验证竞品配置...

✅ YAML 文件解析成功

📊 找到 4 个竞品:

1. WEEX
   品牌名称: WEEX, WEEX Exchange, WEEX Trading, WEEXExchange
   搜索词: 6 个
   意图词: 12 个
   联盟模式: 7 个
   赞助词: 7 个
   风险词: 12 个

2. BITUNIX
   ...

✅ 所有竞品配置有效！

🎯 可用的竞品 ID:
   - weex
   - bitunix
   - blofin
   - lbank

✨ 验证完成！
```

### 方法 2: 使用 TypeScript 测试（完整测试）

```bash
cd "/Users/cancanguo/Desktop/BD KOL Tool"
npx ts-node tests/competitors.test.ts
```

**预期输出：**
```
🧪 开始测试竞品配置解析器...

📋 测试 1: listCompetitors()
✅ 成功获取 4 个竞品
   - weex: WEEX
   - bitunix: BITUNIX
   - blofin: BLOFIN
   - lbank: LBANK

📊 测试 2: getCompetitorCount()
✅ 竞品数量: 4

🎯 测试 3: getCompetitor("weex")
✅ 成功获取 WEEX 配置
   品牌名称: WEEX, WEEX Exchange, WEEX Trading, WEEXExchange
   搜索词数量: 6
   意图词数量: 12
   联盟模式数量: 7
   赞助词数量: 7
   风险词数量: 12

⚠️  测试 4: getCompetitor("invalid_id") - 预期抛出错误
✅ 正确抛出错误: Competitor with id "invalid_id" not found. Available IDs: weex, bitunix, blofin, lbank

🛡️  测试 5: getCompetitorSafe("invalid_id") - 预期返回 null
✅ 正确返回 null

🔍 测试 6: hasCompetitor()
✅ hasCompetitor() 工作正常
   hasCompetitor("weex"): true
   hasCompetitor("invalid"): false

✔️  测试 7: 验证所有竞品字段完整性
✅ 所有竞品字段完整

🔑 测试 8: 验证关键词存在
✅ 关键词验证通过
   意图词: ref, referral, invite, code, bonus...
   联盟模式: ref=, invite=, code=, aff=, referral=, promo=, bonus=
   风险词数量: 12

🎉 所有测试通过！
```

### 方法 3: 通过 API 验证（浏览器）

访问以下 URL 查看配置：

```
http://localhost:3000/api/competitors
```

**预期返回：**
```json
{
  "success": true,
  "count": 4,
  "competitors": [
    {
      "id": "weex",
      "brand_names": ["WEEX", "WEEX Exchange", ...],
      "query_terms": ["WEEX", "WEEX exchange", ...],
      "intent_terms": ["ref", "referral", "invite", ...],
      ...
    },
    ...
  ],
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 方法 4: 使用 curl

```bash
# 获取所有竞品
curl http://localhost:3000/api/competitors | jq

# 只查看竞品 ID
curl http://localhost:3000/api/competitors | jq '.competitors[].id'

# 查看特定竞品
curl http://localhost:3000/api/competitors | jq '.competitors[] | select(.id=="weex")'
```

---

## 📝 测试覆盖

### 单元测试包含：

1. ✅ **listCompetitors()** - 列出所有竞品
2. ✅ **getCompetitorCount()** - 获取数量
3. ✅ **getCompetitor()** - 有效 ID
4. ✅ **getCompetitor()** - 无效 ID（抛出错误）
5. ✅ **getCompetitorSafe()** - 安全获取（返回 null）
6. ✅ **hasCompetitor()** - 检查存在性
7. ✅ **字段完整性** - 验证所有必需字段
8. ✅ **关键词存在** - 验证特定关键词

---

## 🔧 使用示例

### 在代码中使用

```typescript
import { getCompetitor, listCompetitors, hasCompetitor } from '@/src/lib/competitors'

// 示例 1: 获取单个竞品（会抛出错误）
try {
  const weex = getCompetitor('weex')
  console.log(weex.brand_names) // ["WEEX", "WEEX Exchange", ...]
  console.log(weex.query_terms) // ["WEEX", "WEEX exchange", ...]
} catch (error) {
  console.error('竞品不存在:', error.message)
}

// 示例 2: 安全获取（不抛出错误）
import { getCompetitorSafe } from '@/src/lib/competitors'

const competitor = getCompetitorSafe('weex')
if (competitor) {
  console.log('找到竞品:', competitor.id)
} else {
  console.log('竞品不存在')
}

// 示例 3: 列出所有竞品
const allCompetitors = listCompetitors()
console.log(`共有 ${allCompetitors.length} 个竞品`)
allCompetitors.forEach(comp => {
  console.log(`- ${comp.id}: ${comp.brand_names[0]}`)
})

// 示例 4: 检查竞品是否存在
if (hasCompetitor('weex')) {
  console.log('WEEX 配置存在')
}
```

---

## 📊 数据结构

### Competitor 接口

```typescript
interface Competitor {
  id: string                    // 竞品唯一标识
  brand_names: string[]         // 品牌名称列表
  query_terms: string[]         // YouTube 搜索关键词
  intent_terms: string[]        // 意图关键词
  affiliate_patterns: string[]  // 联盟链接模式
  sponsor_terms: string[]       // 赞助关键词
  risk_terms: string[]          // 风险词汇
}
```

### 实际数据示例（WEEX）

```yaml
id: weex
brand_names:
  - WEEX
  - WEEX Exchange
  - WEEX Trading
  - WEEXExchange
query_terms:
  - WEEX
  - WEEX exchange
  - WEEX trading
  - WEEX crypto
  - WEEX review
  - WEEX tutorial
intent_terms:
  - ref
  - referral
  - invite
  - code
  - bonus
  - sponsored
  - partnered
  - ambassador
  - sign up
  - signup
  - promo
  - promotion
  - affiliate
affiliate_patterns:
  - ref=
  - invite=
  - code=
  - aff=
  - referral=
  - promo=
  - bonus=
sponsor_terms:
  - sponsored
  - partnered
  - ambassador
  - brand ambassador
  - paid promotion
  - collaboration
  - partner
risk_terms:
  - guaranteed profit
  - guaranteed returns
  - 保证盈利
  - 稳赚不赔
  - signals group
  - signal group
  - 信号群
  - 100% win rate
  - 零风险
  - no risk
  - get rich quick
  - 快速致富
```

---

## ✅ 验证检查清单

- [ ] JavaScript 验证脚本运行成功
- [ ] TypeScript 测试全部通过（8/8）
- [ ] API 端点返回正确数据
- [ ] 所有 4 个竞品存在
- [ ] 每个竞品包含 7 个必需字段
- [ ] 错误处理工作正常
- [ ] 缓存机制工作正常

---

## 🎯 常见问题

### Q: 如何添加新竞品？
A: 编辑 `/config/competitors.yaml`，按照现有格式添加新条目。

### Q: 如何修改现有竞品配置？
A: 编辑 YAML 文件后，调用 `clearCache()` 重新加载配置。

### Q: 为什么有两个获取函数？
A: 
- `getCompetitor()` - 适用于确定竞品存在的场景，失败时抛出错误
- `getCompetitorSafe()` - 适用于不确定的场景，失败时返回 null

### Q: 配置缓存何时清除？
A: 
- 服务器重启时自动清除
- 手动调用 `clearCache()` 函数

---

现在运行上述任一验证方法，确认系统正常工作！🎉

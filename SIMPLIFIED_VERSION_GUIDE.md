# BD KOL Analytics - 简化版本切换指南

## 📋 版本说明

我已为您创建了**全新的简化版本**，完全按照您的要求重构：

### ✅ 新版本特性

#### 1️⃣ **严格配额控制**
- 每次运行仅选择 **1 个关键词模板**（六选一）
- 只执行 **1 次 search.list** (100 units)
- 只执行 **1 次 videos.list** (1 unit)
- 只执行 **1 次 channels.list** (1 unit)
- **总计: 102 units/次**（而非之前的 1000+ units）

#### 2️⃣ **精简 UI 设计**
- 竞品选择：单选下拉（WEEX / BLOFIN / LBANK / BITUNIX）
- 平台选择：单选下拉（YouTube / X）
- 关键词模板：6 个单选卡片
  1. 合约+返佣：`perps fee rebate`
  2. 合约+联盟：`futures partnership program`
  3. 合约+码：`crypto futures referral code`
  4. 竞品+联盟：`{competitor} futures partnership`
  5. 信号群+合约：`futures signals VIP join`
  6. 教学+合约+返佣：`tutorial perps referral link`

#### 3️⃣ **固定 Top 5 频道展示**
- 仅显示订阅数 >= 100,000 的频道
- 按 relevanceScore 排序
- 显示字段：
  - 频道名称（可点击）
  - 订阅数
  - 相关性评分
  - 命中证据（从视频 title/description 提取的 1-2 条片段）

#### 4️⃣ **移除界面噪音**
- ❌ 移除 Debug/Test Mode（已从主界面移除）
- ✅ Quota Status 改为小型 badge（右上角）
- ✅ Cache Hit 状态一目了然

#### 5️⃣ **强制缓存（24h TTL）**
- Cache Key: `platform + competitor + templateId + regionCode`
- 命中缓存时立即返回，0 API 调用
- UI 右上角显示缓存状态

---

## 🔄 如何切换到新版本

### 方案 A：完全替换（推荐）

```bash
# 1. 备份当前版本
cp app/page.tsx app/page-web3-backup.tsx
cp app/styles-web3.css app/styles-web3-backup.css

# 2. 替换为简化版本
mv app/page-simplified.tsx app/page.tsx
mv app/styles-simplified.css app/styles.css

# 3. 重启开发服务器
npm run dev
```

### 方案 B：并行测试（推荐初次使用）

```bash
# 不替换原有文件，访问新版本的临时路径
# 需要手动在 app/ 目录下创建一个新的页面路由
```

创建 `app/simple/page.tsx`:

```tsx
export { default } from '../page-simplified'
```

然后访问 `http://localhost:3001/simple` 查看新版本。

---

## 📂 新增文件清单

| 文件路径 | 说明 |
|---------|------|
| `app/page-simplified.tsx` | 简化版前端页面（两列布局 + 6 个模板卡片） |
| `app/styles-simplified.css` | 简化版 Web3 样式（保留暗色 + 霓虹，移除复杂组件） |
| `app/api/run-single-query/route.ts` | 新后端 API（单次 102 units 配额） |
| `SIMPLIFIED_VERSION_GUIDE.md` | 本文档 |

---

## 🎯 API 调用逻辑对比

### 旧版本（多查询模式）
```
search.list × 12-18 次 = 1200-1800 units
videos.list × 多次
channels.list × 多次
总计: 2000+ units/次
```

### 新版本（单查询模式）
```
search.list × 1 次 = 100 units
videos.list × 1 次 = 1 unit
channels.list × 1 次 = 1 unit
总计: 102 units/次 ✅
```

**配额节省率: 95%+**

---

## 🧪 验证步骤

### 1️⃣ 启动开发服务器

```bash
cd "/Users/cancanguo/Desktop/BD KOL Tool"
npm run dev
```

### 2️⃣ 打开浏览器

访问 `http://localhost:3001`（如果 3000 端口被占用）

### 3️⃣ 测试流程

1. **选择竞品**: 例如 `WEEX`
2. **选择平台**: `YouTube`
3. **选择模板**: 例如 `竞品+联盟`（会生成 "WEEX futures partnership"）
4. **点击 Run Analysis**
5. **查看结果**:
   - 右上角显示 `💎 102 units` 或 `⚡ Cache Hit`
   - 主区域显示 Top 5 频道卡片
   - 每个频道显示订阅数、相关性评分、命中证据

### 4️⃣ 缓存测试

- 第一次运行: 会调用 YouTube API (102 units)
- 第二次运行（相同竞品 + 模板）: 命中缓存 (0 units)
- 右上角 badge 会显示 `⚡ Cache Hit`

---

## ⚙️ 配置要求

### 环境变量

确保 `.env.local` 包含:

```env
YOUTUBE_API_KEY=你的YouTube API密钥
PHANTOMBUSTER_API_KEY=你的Phantombuster密钥（可选）
```

### 竞品配置

`config/competitors.yaml` 必须包含:

```yaml
competitors:
  - id: weex
    brand_names:
      - WEEX
  - id: blofin
    brand_names:
      - BLOFIN
  - id: lbank
    brand_names:
      - LBANK
  - id: bitunix
    brand_names:
      - BITUNIX
```

---

## 🚨 注意事项

1. **X 平台未配置**: 选择 X 时会提示未配置，Run 按钮置灰
2. **最低订阅数**: 仅显示 >= 100,000 订阅的频道
3. **Top 5 限制**: 最多显示 5 个频道
4. **缓存时效**: 24 小时后自动失效
5. **调试模式**: 已从主界面移除，如需调试请查看浏览器控制台

---

## 📊 UI 效果预览

```
┌─────────────────────────────────────────────────────────────┐
│  🎯 BD KOL Analytics              [⚡ Cache Hit] [🕐 Reset] │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌─────────────────────────────────────┐ │
│  │              │  │                                      │ │
│  │  配置面板    │  │         Top 5 Channels              │ │
│  │              │  │                                      │ │
│  │  🎯 竞品     │  │  #1 Channel Name (👥 500K) 🎯 85   │ │
│  │  🌐 平台     │  │     💬 Evidence snippet 1...         │ │
│  │  🔑 关键词   │  │                                      │ │
│  │    (六选一)  │  │  #2 Channel Name (👥 300K) 🎯 72   │ │
│  │              │  │     💬 Evidence snippet 2...         │ │
│  │  🚀 Run      │  │                                      │ │
│  │              │  │  ...                                 │ │
│  └──────────────┘  └─────────────────────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 问题排查

### 问题 1: 下拉菜单无法选择

**已解决**: 所有背景层已添加 `pointer-events: none`，select 元素添加 `z-index: 100`。

### 问题 2: 模板卡片不显示

**检查**: 确保 `KEYWORD_TEMPLATES` 数组在前端和后端定义一致。

### 问题 3: 返回 0 个频道

**可能原因**:
- 该竞品 + 模板组合没有符合条件的频道（订阅数 < 100k）
- YouTube API 配额已耗尽（查看控制台错误）

### 问题 4: Cache 不生效

**检查**:
- 确保竞品 + 模板选择完全相同
- 查看控制台是否有 `[Cache] HIT` 日志

---

## 📞 技术支持

如有问题，请检查:

1. **浏览器控制台** (`F12` → Console)
2. **终端日志**（运行 `npm run dev` 的终端）
3. **API 响应**（Network 标签查看 `/api/run-single-query` 请求）

---

## ✅ 总结

✅ **配额节省**: 95%+（从 2000+ units → 102 units）  
✅ **UI 简化**: 移除噪音，聚焦核心功能  
✅ **强制缓存**: 24h TTL，避免重复调用  
✅ **精准过滤**: 仅显示高价值频道（>= 100k 订阅）  
✅ **证据驱动**: 显示命中证据，提升可信度  

🚀 **立即切换到新版本，开始省配额的高效分析！**

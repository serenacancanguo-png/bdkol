# 前端页面功能说明

## ✅ 已实现功能

### 1. 下拉选择 Competitor
- ✅ 从 `listCompetitors()` API 动态读取竞品列表
- ✅ 下拉选择框（`<select>`）显示所有竞品
- ✅ 显示格式：`品牌名称 (id)`（如：WEEX (weex)）
- ✅ 自动选中第一个竞品

### 2. Run 按钮
- ✅ 点击 "Run Analysis" 调用 `/api/run-youtube`
- ✅ 发送请求：`{ competitorId, maxResults: 50 }`
- ✅ 加载状态显示
- ✅ 禁用状态管理

### 3. 表格展示 Top 50
- ✅ 使用 HTML `<table>` 展示结果
- ✅ 包含以下列：
  - **#** - 排名序号
  - **Channel** - 频道名称（可点击链接）
  - **Score** - 置信度分数（带颜色标识）
  - **Type** - 关系类型
  - **Subs** - 订阅数（格式化：125K, 1.2M）
  - **Videos** - 视频数量
  - **Evidence** - 证据列表（类型 + 片段）

### 4. Export CSV 按钮
- ✅ "📥 Export to CSV" 按钮
- ✅ 浏览器端生成 CSV
- ✅ 自动下载文件
- ✅ 文件命名：`kol_analysis_{competitor}_{date}.csv`
- ✅ 包含所有列数据

### 5. 简单设计
- ✅ 纯 HTML + 内联样式
- ✅ 无复杂 UI 库
- ✅ 无 Tailwind（使用简单 CSS）
- ✅ 响应式表格（横向滚动）

---

## 📊 页面功能

### 控制面板
```
┌─────────────────────────────┐
│ Select Competitor:          │
│ [WEEX (weex) ▼]            │
│                             │
│ [Run Analysis]              │
└─────────────────────────────┘
```

### 结果统计
```
┌────────────────────────────────────────┐
│ Results: WEEX                          │
│ Channels Found: 25 | Videos: 320 | ... │
└────────────────────────────────────────┘

[📥 Export to CSV]
```

### 结果表格
```
┌────┬──────────────┬───────┬─────────────┬────────┬────────┬─────────────────┐
│ #  │ Channel      │ Score │ Type        │ Subs   │ Videos │ Evidence        │
├────┼──────────────┼───────┼─────────────┼────────┼────────┼─────────────────┤
│ 1  │ Crypto Pro   │  92   │ CONFIRMED   │ 250K   │   5    │ AFFILIATE_LINK: │
│    │              │       │             │        │        │ ...ref=TRADER123│
├────┼──────────────┼───────┼─────────────┼────────┼────────┼─────────────────┤
│ 2  │ Trader News  │  85   │ LIKELY      │ 180K   │   3    │ PROMO_CODE: ... │
└────┴──────────────┴───────┴─────────────┴────────┴────────┴─────────────────┘
```

---

## 🎨 视觉特性

### 分数颜色编码
- **80-100 分** → 绿色背景（高置信度）
- **60-79 分** → 黄色背景（中等置信度）
- **0-59 分** → 红色背景（低置信度）

### 链接样式
- 频道名称：蓝色可点击链接
- 新标签页打开 YouTube 频道

### 证据展示
- 每条证据单独一行
- 类型加粗显示（蓝色）
- 片段限制 80 字符（超出显示 ...）

---

## 📥 CSV 导出功能

### 导出字段
```csv
Competitor,Channel ID,Channel Title,Channel URL,Confidence Score,Relationship Type,Subscriber Count,Video Count,Evidence Type,Evidence Snippet,Last Seen Date
weex,UCxxxxx,"Crypto Pro",https://youtube.com/channel/UCxxxxx,92,CONFIRMED_PARTNER,250000,5,"AFFILIATE_LINK; PROMO_CODE","...ref=TRADER123; ...code WEEX100",1/20/2024
```

### 文件命名
```
kol_analysis_weex_2024-01-20.csv
kol_analysis_bitunix_2024-01-20.csv
```

### CSV 特性
- ✅ 自动转义引号（`"` → `""`）
- ✅ 多个证据用分号分隔
- ✅ 日期格式化
- ✅ 浏览器端生成（无需服务器）
- ✅ 自动触发下载

---

## 🔍 详细功能说明

### 1. 竞品选择器
```typescript
<select value={selectedCompetitor} onChange={...}>
  <option value="weex">WEEX (weex)</option>
  <option value="bitunix">BITUNIX (bitunix)</option>
  <option value="blofin">BLOFIN (blofin)</option>
  <option value="lbank">LBANK (lbank)</option>
</select>
```

### 2. Run 按钮逻辑
```typescript
const handleRun = async () => {
  // 调用 API
  const response = await fetch('/api/run-youtube', {
    method: 'POST',
    body: JSON.stringify({
      competitorId: selectedCompetitor,
      maxResults: 50,
    }),
  })
  
  const data = await response.json()
  setResult(data)
}
```

### 3. 表格渲染
```typescript
<table>
  <thead>
    <tr>
      <th>#</th>
      <th>Channel</th>
      <th>Score</th>
      <th>Type</th>
      <th>Subs</th>
      <th>Videos</th>
      <th>Evidence</th>
    </tr>
  </thead>
  <tbody>
    {channels.map((channel, index) => (
      <tr>
        <td>{index + 1}</td>
        <td><a href={channel.channelUrl}>{channel.channelTitle}</a></td>
        <td>{channel.confidenceScore}</td>
        <td>{channel.relationshipType}</td>
        <td>{formatNumber(channel.subscriberCount)}</td>
        <td>{channel.videoCount}</td>
        <td>
          {channel.evidenceList.map(e => (
            <div>{e.type}: {e.snippet}</div>
          ))}
        </td>
      </tr>
    ))}
  </tbody>
</table>
```

### 4. CSV 导出
```typescript
const exportToCSV = () => {
  // 1. 生成 CSV 内容
  const headers = ['Competitor', 'Channel ID', ...]
  const rows = channels.map(channel => [...])
  const csv = [headers.join(','), ...rows].join('\n')
  
  // 2. 创建 Blob
  const blob = new Blob([csv], { type: 'text/csv' })
  
  // 3. 触发下载
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `kol_analysis_${competitor}_${date}.csv`
  link.click()
}
```

---

## 💡 使用流程

### 步骤 1: 选择竞品
```
下拉菜单选择：WEEX / BITUNIX / BLOFIN / LBANK
```

### 步骤 2: 运行分析
```
点击 "Run Analysis" 按钮
等待 30-60 秒
```

### 步骤 3: 查看结果
```
表格显示 top 50 频道
按置信度分数从高到低排列
```

### 步骤 4: 导出数据
```
点击 "Export to CSV" 按钮
自动下载 CSV 文件
```

---

## 🎯 界面预览

### 顶部控制区
```
BD KOL Tool - YouTube Creator Analysis

┌──────────────────────────────┐
│ Select Competitor:           │
│ [WEEX (weex) ▼]             │
│                              │
│ [Run Analysis]               │
└──────────────────────────────┘
```

### 加载状态
```
⏳ Analyzing... This may take 30-60 seconds...
Searching videos, extracting evidence, and scoring channels...
```

### 结果统计
```
┌────────────────────────────────────────────────────┐
│ Results: WEEX                                      │
│ Channels: 25 | Videos: 320 | Queries: 15 | 45.2s │
└────────────────────────────────────────────────────┘

[📥 Export to CSV]
```

### 数据表格
```
┌────┬────────────────┬───────┬─────────────────┬────────┬────────┬────────────────────┐
│ #  │ Channel        │ Score │ Type            │ Subs   │ Videos │ Evidence           │
├────┼────────────────┼───────┼─────────────────┼────────┼────────┼────────────────────┤
│ 1  │ Crypto Pro     │  92   │ CONFIRMED       │ 250K   │   5    │ AFFILIATE_LINK:... │
│    │ [link]         │       │ PARTNER         │        │        │ PROMO_CODE:...     │
├────┼────────────────┼───────┼─────────────────┼────────┼────────┼────────────────────┤
│ 2  │ Trader Academy │  85   │ LIKELY          │ 180K   │   3    │ SPONSORED:...      │
│    │ [link]         │       │ PARTNER         │        │        │                    │
└────┴────────────────┴───────┴─────────────────┴────────┴────────┴────────────────────┘
```

---

## ✅ 功能检查清单

- [x] 下拉选择 competitor（从 listCompetitors() 读取）
- [x] 点击 Run 调用 /api/run-youtube
- [x] 表格展示 top 50
  - [x] 包含 score
  - [x] 包含 type
  - [x] 包含 evidence（类型 + 片段）
  - [x] 包含频道链接
- [x] Export CSV 按钮
  - [x] 浏览器端生成
  - [x] 自动下载
  - [x] 完整数据导出
- [x] 简单 HTML（无复杂 UI 库）
- [x] 使用内联样式
- [x] 加载状态显示
- [x] 错误处理
- [x] 统计信息显示

---

## 🚀 使用方法

1. **启动服务器**
```bash
npm run dev
```

2. **打开浏览器**
```
http://localhost:3000
```

3. **操作流程**
   - 选择竞品（下拉菜单）
   - 点击 "Run Analysis"
   - 等待结果（30-60 秒）
   - 查看表格数据
   - 点击 "Export to CSV" 导出

---

## 📊 数据示例

### 表格显示
| # | Channel | Score | Type | Subs | Videos | Evidence |
|---|---------|-------|------|------|--------|----------|
| 1 | Crypto Pro | 92 | CONFIRMED PARTNER | 250K | 5 | AFFILIATE_LINK: ...ref=TRADER<br>PROMO_CODE: ...code WEEX100 |
| 2 | Trader News | 85 | LIKELY PARTNER | 180K | 3 | SPONSORED: ...sponsored by WEEX |

### CSV 导出
```csv
Competitor,Channel ID,Channel Title,Channel URL,Confidence Score,Relationship Type,Subscriber Count,Video Count,Evidence Type,Evidence Snippet,Last Seen Date
weex,UCxxxxx,"Crypto Pro",https://youtube.com/channel/UCxxxxx,92,CONFIRMED_PARTNER,250000,5,"AFFILIATE_LINK; PROMO_CODE","...ref=TRADER123; ...code WEEX100",1/20/2024
```

---

## 🎨 设计特点

- **最小化设计** - 简单的 HTML 结构
- **内联样式** - 无需外部 CSS 框架
- **功能优先** - 专注于数据展示
- **易于维护** - 代码简洁清晰
- **快速加载** - 无额外依赖

---

## 💻 代码结构

```typescript
// 组件结构
Home
  ├─ 控制面板
  │   ├─ 下拉选择器（competitor）
  │   └─ Run 按钮
  ├─ 错误显示
  ├─ 加载提示
  └─ 结果显示
      ├─ 统计信息
      ├─ Export CSV 按钮
      └─ 数据表格（top 50）
```

---

## ✨ 额外特性

### 状态管理
- ✅ 加载状态（禁用按钮、显示提示）
- ✅ 错误状态（红色提示框）
- ✅ 结果状态（表格显示）

### 数据格式化
- ✅ 订阅数：125K, 1.2M, 2.5M
- ✅ 日期：本地化日期格式
- ✅ 证据片段：截断到 80 字符

### 用户体验
- ✅ 加载时显示预计时间
- ✅ 分数颜色编码（绿/黄/红）
- ✅ 频道链接新标签打开
- ✅ 表格横向滚动（适配小屏幕）
- ✅ 空数据友好提示

---

现在页面已经完全实现所有要求的功能！刷新浏览器即可使用。🎉

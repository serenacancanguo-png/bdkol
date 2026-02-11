# BD KOL Tool - YouTube 分析工具

这是一个使用 Next.js 14+ (App Router) 和 TypeScript 构建的 YouTube KOL 分析工具 MVP。

## 技术栈

- **Next.js 14+** (App Router)
- **TypeScript**
- **Node.js 运行时**
- **内存存储**（暂不使用数据库）

## 项目结构

```
BD KOL Tool/
├── app/
│   ├── layout.tsx           # 根布局
│   ├── page.tsx             # 首页
│   └── api/
│       └── run-youtube/
│           └── route.ts     # YouTube API 路由
├── .env.local               # 环境变量（本地）
├── .env.example             # 环境变量模板
├── .gitignore               # Git 忽略文件
├── next.config.js           # Next.js 配置
├── package.json             # 项目依赖
├── tsconfig.json            # TypeScript 配置
└── README.md                # 项目文档
```

## 开始使用

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 到 `.env.local` 并填入你的 API Keys：

```bash
cp .env.example .env.local
```

编辑 `.env.local`：

```env
# YouTube Data API Key（必需）
YOUTUBE_API_KEY=你的_YouTube_API_Key

# Phantombuster API Key（可选，用于 Google 搜索方案）
PHANTOMBUSTER_API_KEY=I59ldLQyJfJ3ZQQgMXBcAbcZbAI496A9VZR5BItZJHo
```

**⚠️ 重要**: 修改 `.env.local` 后，必须重启开发服务器才能生效：

```bash
# 停止当前服务器（Ctrl+C）
# 然后重新启动
npm run dev
```

### 3. 运行开发服务器

```bash
npm run dev
```

打开浏览器访问 [http://localhost:3000](http://localhost:3000)

### 4. 构建生产版本

```bash
npm run build
npm start
```

## API 测试

### 测试 Phantombuster API 连接

运行以下命令测试 Phantombuster API 配置是否正确：

```bash
npm run phantom:test
```

**成功响应示例**：
```json
{
  "success": true,
  "message": "✅ Phantombuster API connection successful!",
  "phantombuster": {
    "status": "connected",
    "email": "your@email.com",
    "timeLeft": "3600000",
    "apiUsage": {
      "currentMonthExecutionTime": 120000,
      "maxMonthlyExecutionTime": 3600000
    }
  },
  "timestamp": "2026-02-09T12:00:00.000Z"
}
```

**错误响应示例**（API Key 未配置）：
```json
{
  "success": false,
  "error": "PHANTOMBUSTER_API_KEY is not configured",
  "message": "Please add PHANTOMBUSTER_API_KEY to your .env.local file and restart the dev server",
  "hint": "PHANTOMBUSTER_API_KEY=your_api_key_here"
}
```

---

## API 端点

### POST /api/run-youtube

执行 YouTube 分析（目前返回模拟数据）

**请求体：**
```json
{
  "query": "搜索关键词"
}
```

**响应：**
```json
{
  "success": true,
  "result": {
    "id": "result_1234567890",
    "query": "搜索关键词",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "data": {
      "videos": [...],
      "totalResults": 2
    }
  },
  "storedCount": 1,
  "message": "YouTube 分析完成（使用模拟数据）"
}
```

### GET /api/run-youtube

获取所有存储在内存中的结果

**响应：**
```json
{
  "success": true,
  "results": [...],
  "count": 1
}
```

## 功能特点

- ✅ 使用 Node.js 运行时
- ✅ 支持环境变量配置
- ✅ 内存存储（最多保留 100 条记录）
- ✅ TypeScript 类型安全
- ✅ App Router 架构
- ✅ 简洁的 UI 界面

## 后续开发计划

- [ ] 接入真实的 YouTube Data API
- [ ] 添加数据库支持（PostgreSQL/MongoDB）
- [ ] 添加用户认证
- [ ] 添加数据可视化
- [ ] 添加批量分析功能

## 注意事项

- 当前使用内存存储，服务重启后数据会丢失
- 目前返回的是模拟数据，需要接入真实的 YouTube API
- 生产环境请使用数据库存储数据

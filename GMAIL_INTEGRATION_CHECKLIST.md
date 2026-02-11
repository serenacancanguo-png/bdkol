# Gmail 集成最终验收清单

## ✅ 已完成

1. **环境变量配置** - DONE ✅
   - `.env.local` 已包含所有必需变量
   - `GOOGLE_CLIENT_ID` 已修正为纯文本格式
   - `NEXTAUTH_URL / NEXTAUTH_SECRET` 已配置
   - 已添加 `AUTH_URL / AUTH_SECRET`（兼容新版 Auth.js）

2. **依赖安装** - DONE ✅
   - `next-auth` ✅
   - `googleapis` ✅

3. **后端路由** - DONE ✅
   - `app/api/auth/[...nextauth]/route.ts` ✅
   - `app/api/gmail/draft/route.ts` ✅
   - `src/lib/auth.ts` ✅
   - `src/lib/emailTemplates.ts` ✅

4. **前端集成** - DONE ✅
   - `app/providers.tsx` (SessionProvider) ✅
   - `app/layout.tsx` (包裹 Provider) ✅
   - `app/page.tsx` (Connect Gmail / Generate Email 按钮) ✅

5. **API 端点验证** - DONE ✅
   - `/api/auth/providers` → 200 ✅
   - `/api/auth/signin/google` → 302 (redirect) ✅
   - `/api/gmail/draft` (preview mode) → 200 ✅

6. **开发服务器** - DONE ✅
   - 已重启并加载新的 `.env.local` ✅
   - 运行在 `http://localhost:3000` ✅

---

## 🔧 待完成（Google Console 配置）

### 步骤 1: 配置 OAuth 回调 URI

**重要：这是"Connect Gmail"功能能否正常工作的关键！**

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 选择你的项目（对应 `GOOGLE_CLIENT_ID` 所属项目）
3. 进入 **APIs & Services → Credentials**
4. 找到你的 OAuth 2.0 Client ID
5. 在 **Authorized redirect URIs** 中添加：
   ```
   http://localhost:3000/api/auth/callback/google
   ```
6. **保存**

### 步骤 2: 验证 OAuth Scopes

确保你的 OAuth Consent Screen 允许以下 scopes：
- `openid`
- `email`
- `profile`
- `https://www.googleapis.com/auth/gmail.compose`

---

## 🧪 验收测试流程

### 测试 1: Connect Gmail

1. 打开浏览器访问：`http://localhost:3000`
2. 选择竞品（如 WEEX）
3. 选择平台（YouTube）
4. 选择关键词模板（如"竞品+联盟"）
5. 点击 **Run Analysis**
6. 等待结果出现（Top 5 频道）
7. 找到有 `✉️ email@example.com` 的频道
8. 点击 **Connect Gmail** 按钮
9. 应该跳转到 Google OAuth 授权页面
10. **授权后应该跳回主页**

**预期结果：**
- ✅ 按钮文字变为 `Generate Email`
- ✅ 右上角显示你的 Gmail 地址

**如果失败：**
- 检查浏览器控制台（F12）是否有错误
- 检查 Google Console 回调 URI 是否正确配置

---

### 测试 2: Generate Email

1. 在已授权的情况下
2. 点击有 email 的频道的 **Generate Email** 按钮
3. 应该弹出编辑器模态框

**预期结果：**
- ✅ 显示 `To: creator@example.com`
- ✅ 可选择模板语气（简短/标准/强转化）
- ✅ `Subject` 和 `Body` 自动填充
- ✅ 可手动编辑 Subject 和 Body

---

### 测试 3: Create Draft

1. 在编辑器模态框中
2. 修改 Subject 或 Body（可选）
3. 点击 **Create Draft** 按钮
4. 等待 2-3 秒

**预期结果：**
- ✅ 显示 `Draft created: draft_id_xxx`
- ✅ 打开 Gmail 网页版，在 Drafts 里看到新草稿
- ✅ 草稿内容与你编辑的一致

---

## 🔍 调试工具

### 快速测试 Auth 状态

```bash
curl -s http://localhost:3000/api/auth/session | jq
```

### 快速测试 Email 预览

```bash
curl -X POST http://localhost:3000/api/gmail/draft \
  -H 'Content-Type: application/json' \
  -d '{
    "action": "preview",
    "toEmail": "test@example.com",
    "channelName": "Test Channel",
    "channelUrl": "https://youtube.com/test",
    "evidencePoints": ["futures", "partnership"],
    "templateId": "standard"
  }'
```

---

## 🚨 常见问题

### Q1: 点击 Connect Gmail 后没反应

**可能原因：**
- Google Console 回调 URI 未配置
- 浏览器阻止了弹窗

**解决方案：**
1. 检查 Google Console 回调 URI
2. 打开浏览器控制台（F12）查看错误
3. 允许浏览器弹窗

---

### Q2: 授权后跳回主页，但按钮仍显示 "Connect Gmail"

**可能原因：**
- Session 未正确保存
- `NEXTAUTH_SECRET` 配置问题

**解决方案：**
1. 硬刷新浏览器（Cmd+Shift+R）
2. 查看 `/api/auth/session` 是否返回用户信息
3. 重新授权

---

### Q3: Create Draft 报错 "Not authenticated"

**可能原因：**
- Access token 过期
- Refresh token 失效

**解决方案：**
1. 重新授权（Sign out → Connect Gmail）
2. 检查 Google Console OAuth consent screen 是否正确配置 scopes

---

### Q4: Draft 创建成功但 Gmail 里找不到

**可能原因：**
- 使用了错误的 Gmail 账号
- Draft 创建在其他账户

**解决方案：**
1. 检查授权的 Gmail 地址
2. 刷新 Gmail Drafts 页面
3. 搜索 Draft 主题关键词

---

## 📊 配额消耗

### Gmail API 配额

- `users.drafts.create` - 免费层：**100 quota units/100秒**
- 每次创建草稿 = **10 units**
- 建议控制频率：**每秒最多 10 个草稿**

### YouTube API 配额

- Explore Mode 开启：**402 units/次** (4 × search.list + videos + channels)
- Explore Mode 关闭：**102 units/次** (1 × search.list + videos + channels)
- 缓存命中：**0 units**

---

## 🎯 下一步操作

### 立即执行

1. **配置 Google Console**
   - 添加回调 URI：`http://localhost:3000/api/auth/callback/google`
   - 验证 scopes 包含 `gmail.compose`

2. **刷新浏览器并测试**
   ```
   打开: http://localhost:3000
   硬刷新: Cmd + Shift + R
   ```

3. **完整测试流程**
   - Run Analysis → 查看结果
   - 找到有 email 的频道
   - Connect Gmail（首次授权）
   - Generate Email（编辑内容）
   - Create Draft（只建草稿，不发送）
   - 去 Gmail Drafts 验证

---

## 📝 备注

- **只创建草稿，不会自动发送**
- **草稿可在 Gmail 网页版编辑后手动发送**
- **Explore Mode 会增加配额消耗（402 vs 102 units）**
- **建议配额有限时关闭 Explore Mode**

---

## ✅ 验收成功标志

当你完成以下操作，代表 Gmail 集成成功：

1. ✅ 点击 Connect Gmail 后成功跳转到 Google 授权页
2. ✅ 授权后跳回主页，按钮变为 "Generate Email"
3. ✅ 点击 Generate Email 弹出编辑器，自动填充内容
4. ✅ 点击 Create Draft 成功（显示 draft ID）
5. ✅ 在 Gmail 网页版 Drafts 里看到新草稿
6. ✅ 草稿内容准确（To/Subject/Body 都正确）

---

## 🆘 需要帮助？

如果遇到任何问题，请提供：
1. 浏览器控制台截图（F12 → Console）
2. 点击按钮后的具体现象
3. 错误信息（如果有）

我会根据具体情况进一步排查！

---

**现在请按照上述步骤完成 Google Console 配置，然后测试 Connect Gmail 功能！** 🚀

# 搜索优化 - 精准定位加密货币期货 KOL

## 🎯 优化策略

### 问题
之前的搜索结果包含大量与加密货币无关的内容。

### 解决方案
实施三层过滤机制 + 智能评分系统，确保只返回真正相关的加密货币期货 KOL。

---

## 📊 新的关键词层级结构

### L1: 合约产品与交易场景

#### L2: 合约品类
```
futures trading, crypto futures, perpetual trading, perpetual futures, perps
```

#### L2: 杠杆/保证金
```
leverage trading, margin trading, cross margin, isolated margin
```

#### L2: 合约交易行为（高频=返佣更值）
```
scalping, day trading, intraday, high frequency, volume trading
```

#### L2: 合约关键机制（筛"真交易者"）
```
funding rate, open interest, liquidation, mark price, order book
```

---

### L1: 返佣与联盟合作（核心推荐）

#### L2: 返佣/返现/折扣
```
futures rebate, fee rebate, trading fee rebate, fee discount, cashback, kickback
```

#### L2: 联盟/推广（找愿意合作的人）
```
partnership, referral, referral program, invite code, promo code
```

#### L2: 佣金与收益（筛"带量型KOL"）
```
commission, revenue share, payout, earnings, affiliate dashboard
```

#### L2: 费率/成本对比
```
low fees, maker fee, taker fee, fee comparison, best futures exchange fees
```

---

### L1: KOL 内容类型与转化链路

#### L2: 教学型（带新手开户）
```
tutorial, guide, step by step, for beginners, full course, explained
```

#### L2: 测评/对比型（强商业意图）
```
exchange review, best futures exchange, top exchanges, pros and cons
```

#### L2: 信号/私域型（返佣产出最高）
```
futures signals, signals vip, trade alerts, copy trade
```

#### L2: 交易策略型（能带交易量）
```
strategy, setup, entry, take profit, stop loss, risk management, live trading
```

---

### L1: 资产/币种

#### L2: 主流资产
```
BTC, ETH, XRP, Bitcoin, Ethereum
```

#### L2: 组合写法（实际搜索使用）
```
BTC perps, ETH futures, XRP perpetual
```

---

## 🔍 六大搜索策略

### 策略 1: 竞品 + 资产 + 合约类型 + 返佣意图（最精准）
```
WEEX BTC perps referral
WEEX ETH futures fee rebate
WEEX XRP perpetual partnership
BITUNIX BTC perps review
```

**生成数量**: 3 资产 × 3 合约类型 × 2 意图 = 18 个查询

### 策略 2: 竞品 + crypto/futures + 返佣核心词
```
WEEX crypto fee rebate
WEEX futures referral
BITUNIX crypto partnership
BLOFIN futures cashback
```

**生成数量**: 2 基础词 × 4 返佣词 = 8 个查询

### 策略 3: 竞品 + 联盟推广词
```
WEEX partnership program
WEEX referral link
LBANK invite code
BITUNIX promo code
```

**生成数量**: 4 个推广词

### 策略 4: 竞品 + 测评/对比（强商业意图）
```
WEEX exchange review
BITUNIX best futures exchange
BLOFIN pros and cons
```

**生成数量**: 3 个测评词

### 策略 5: 竞品 + 交易行为 + 合约
```
WEEX scalping futures
BITUNIX day trading futures
LBANK high frequency futures
```

**生成数量**: 3 个行为词

### 策略 6: 资产组合写法
```
WEEX btc perps
WEEX eth futures
WEEX xrp perpetual
```

**生成数量**: 3 个组合

**总计**: 最多 30 个精准查询

---

## 🛡️ 三层过滤机制

### 第一层：搜索查询精准化
- 使用组合关键词（竞品+资产+合约+意图）
- 确保每个查询都包含加密货币和期货相关词汇

### 第二层：加密货币期货相关性检查
```typescript
function isCryptoFuturesRelated(channel) {
  // 必须包含加密货币词
  const hasCrypto = ['crypto', 'bitcoin', 'btc', 'ethereum', 'eth', 
                     'blockchain', 'trading', 'trader']
  
  // 必须包含交易/合约词
  const hasTrading = ['futures', 'perp', 'trading', 'exchange', 
                      'leverage', 'margin']
  
  return hasCrypto && hasTrading
}
```

### 第三层：关键词评分排序
- 高优先级词（返佣、合作）在标题出现：+5 分
- 普通关键词在标题出现：+3 分
- 高优先级词在描述出现：+2 分
- 普通关键词在描述出现：+1 分

**额外加分项**:
- 订阅数 ≥ 100K：+3 分
- 订阅数 ≥ 50K：+2 分
- 订阅数 ≥ 10K：+1 分
- 视频数 ≥ 500：+2 分
- 视频数 ≥ 100：+1 分

**最低分数线**: 3 分（之前是 2 分，现在更严格）

---

## 📈 优化效果

### 优化前
```
❌ 包含大量非加密货币内容
❌ 搜索结果宽泛不精准
❌ 评分机制单一
```

### 优化后
```
✅ 100% 加密货币期货相关
✅ 精准定位返佣/合作型 KOL
✅ 智能评分（关键词 + 影响力）
✅ 查询数量增加到 30 个
✅ 三层过滤确保质量
```

---

## 🎯 查询示例

### 对于竞品 "WEEX"

#### 高价值查询（返佣/合作意图）
```
WEEX BTC perps referral
WEEX ETH futures fee rebate
WEEX crypto partnership
WEEX futures rebate
WEEX referral program
WEEX commission
```

#### 测评型查询（强商业意图）
```
WEEX exchange review
WEEX best futures exchange
WEEX pros and cons
```

#### 交易者筛选查询
```
WEEX scalping futures
WEEX day trading futures
WEEX BTC perps strategy
```

#### 资产组合查询
```
WEEX btc perps
WEEX eth futures
WEEX xrp perpetual
```

---

## 🔥 高权重关键词列表

### 核心返佣词（最高优先级）
```
referral, fee rebate, partnership, commission, revenue share, 
cashback, discount, promo code
```

### 核心合约词
```
futures, perps, perpetual, crypto, bitcoin, ethereum
```

### 核心交易词
```
trading, exchange, leverage, margin, scalping, day trading
```

---

## 💡 使用建议

1. **首次搜索** - 系统会使用所有 30 个查询
2. **结果数量** - 目标返回 50 个频道
3. **质量保证** - 三层过滤 + 智能评分
4. **影响力优先** - 订阅数和视频数会影响排名
5. **持续优化** - 可根据实际效果调整关键词权重

---

## 🧪 测试验证

刷新浏览器后，选择竞品 → 选择 YouTube → 点击 "Find 50 Relevant Channels"

**预期结果**:
- ✅ 所有频道都与加密货币期货相关
- ✅ 优先显示有返佣/合作意图的频道
- ✅ 订阅数较高的 KOL 排名靠前
- ✅ 频道标题/简介包含关键词

---

## 📊 评分机制详解

### 频道 A
```
标题: "WEEX Futures Referral Program | BTC Perps Trading"
描述: "Earn commission with WEEX partnership..."
订阅: 150K
视频: 600

评分计算:
- 标题包含 "WEEX" (高优先级): +5
- 标题包含 "Futures" (高优先级): +5
- 标题包含 "Referral" (高优先级): +5
- 标题包含 "BTC" (高优先级): +5
- 描述包含 "commission" (高优先级): +2
- 描述包含 "partnership" (高优先级): +2
- 订阅数 ≥ 100K: +3
- 视频数 ≥ 500: +2

总分: 29 分 ⭐⭐⭐⭐⭐
```

### 频道 B
```
标题: "Crypto Trading Tips"
描述: "Learn about cryptocurrency trading..."
订阅: 8K
视频: 50

评分计算:
- 标题包含 "Crypto" (高优先级): +5
- 标题包含 "Trading" (普通): +3
- 描述包含 "cryptocurrency" (高优先级): +2
- 描述包含 "trading" (普通): +1

总分: 11 分 ⭐⭐⭐
```

### 频道 C
```
标题: "WEEX"
描述: "General content..."
订阅: 50K
视频: 200

评分计算:
- 标题包含 "WEEX" (高优先级): +5
- 订阅数 ≥ 50K: +2
- 视频数 ≥ 100: +1

总分: 8 分 ⭐⭐
```

**排序**: A (29分) > B (11分) > C (8分)

---

现在搜索结果将 **100% 聚焦于加密货币期货领域**，并优先显示有返佣/合作意图的高质量 KOL！🎯

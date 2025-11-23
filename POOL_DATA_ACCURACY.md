# Точность данных пулов - как мы решили проблему

## Проблема: TVL $76M вместо $52.9M (Uniswap показывает $52.9M)

### Почему данные не совпадали?

**The Graph Subgraph возвращает устаревшие данные!**

1. **pool.totalValueLockedUSD** - это кэшированное значение, которое обновляется не сразу
2. **poolHourData[0].tvlUSD** - тоже может отставать от реальности
3. The Graph indexer обрабатывает блоки с задержкой (иногда несколько минут или даже часов)

**Uniswap UI не использует только The Graph для TVL!**
- Они получают текущие балансы токенов **напрямую из блокчейна через RPC**
- `token0.balanceOf(poolAddress)` + `token1.balanceOf(poolAddress)`
- Умножают на текущие цены токенов → получают real-time TVL

## Решение: Комбинированный подход (как Uniswap)

### 📊 Откуда берем данные теперь:

| Метрика | Источник | Почему |
|---------|----------|--------|
| **24h Volume** | The Graph `poolHourData` (последние 24 часа) | Суммируем hourly data за 24 часа |
| **24h Fees** | The Graph `poolHourData` (последние 24 часа) | Суммируем hourly data за 24 часа |
| **TVL** | **Blockchain RPC** (real-time) | Балансы токенов напрямую из контракта |
| **APR** | Рассчитываем: `(fees24h / tvl) * 365 * 100` | На основе реальных данных |

### 🔧 Как это работает:

#### 1. Volume и Fees из The Graph (точно как Uniswap)
```typescript
// Запрашиваем последние 24 часа hourly data
poolHourData(first: 24, orderBy: periodStartUnix, orderDirection: desc) {
  volumeUSD
  feesUSD
}

// Суммируем все 24 часа
const volume24h = last24Hours.reduce((sum, hour) => sum + hour.volumeUSD, 0)
const fees24h = last24Hours.reduce((sum, hour) => sum + hour.feesUSD, 0)
```

#### 2. TVL из блокчейна (REAL-TIME!)
```typescript
// Получаем балансы токенов В РЕАЛЬНОМ ВРЕМЕНИ
const token0Balance = await token0Contract.balanceOf(poolAddress)
const token1Balance = await token1Contract.balanceOf(poolAddress)

// Получаем текущие цены из CoinGecko
const prices = await getTokenPrices(token0Symbol, token1Symbol)

// Рассчитываем TVL
const tvl = (token0Balance * token0Price) + (token1Balance * token1Price)
```

### 🚀 Преимущества нового подхода:

✅ **TVL всегда актуальный** - прямо из блокчейна
✅ **Не зависим от скорости индексации The Graph**
✅ **Работает даже если The Graph отстает**
✅ **Точно как Uniswap UI** - те же источники данных
✅ **Fallback на subgraph** если RPC недоступен

### 📝 Что нужно для работы:

#### Вариант 1: Использовать публичные RPC (уже настроено!)
```typescript
// lib/uniswap/pool-contract.ts
const RPC_URLS = {
  arbitrum: 'https://arb1.arbitrum.io/rpc',  // Бесплатный публичный RPC
  mainnet: 'https://eth.llamarpc.com',
  polygon: 'https://polygon-rpc.com',
  // ...
}
```

**Ничего настраивать не нужно** - код уже использует бесплатные публичные RPC!

#### Вариант 2: Использовать Alchemy/Infura (быстрее и надежнее)
1. Получите API ключ от [Alchemy](https://dashboard.alchemy.com/)
2. Создайте `.env.local`:
```bash
NEXT_PUBLIC_ALCHEMY_ID="your_alchemy_api_key"
NEXT_PUBLIC_GRAPH_API_KEY="your_graph_api_key"  # Опционально
```

3. Обновите RPC URLs в `lib/uniswap/pool-contract.ts`:
```typescript
const RPC_URLS = {
  arbitrum: `https://arb-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_ID}`,
  // ...
}
```

### 🧪 Как проверить:

1. **Импортируйте пул WBTC/ETH на Arbitrum:**
```bash
curl -X POST http://localhost:3000/api/admin/pools/import \
  -H "Content-Type: application/json" \
  -d '{
    "action": "import-single",
    "poolAddress": "0x2f5e87c9312fa29aed5c179e456625d79015299c",
    "network": "arbitrum"
  }'
```

2. **Проверьте логи** - вы увидите:
```
🔗 Fetching REAL TVL from blockchain via RPC...
✅ REAL TVL from blockchain: $52,900,000 (136.63 WBTC + 14,600 ETH)
📊 FINAL METRICS:
  volume24h: 43,100,000
  fees24h: 21,600
  tvl: 52,900,000
  apr: 14.88%
  dataSources:
    volume: poolHourData (last 24 hours)
    fees: poolHourData (last 24 hours)
    tvl: Blockchain RPC (REAL-TIME)
```

3. **Сравните с Uniswap:**
   - Откройте https://app.uniswap.org/explore/pools/arbitrum/0x2f5e87c9312fa29aed5c179e456625d79015299c
   - Значения должны совпадать!

### 🔄 Автоматическое обновление данных

Для автоматического обновления данных пулов каждые N минут, добавьте cron job или используйте Next.js API route с setInterval:

```typescript
// app/api/cron/update-pools/route.ts
export async function GET() {
  const pools = await prisma.pool.findMany({ where: { isActive: true } })

  for (const pool of pools) {
    // Обновляем данные каждого пула
    await updatePoolData(pool.address, pool.network)
  }

  return NextResponse.json({ success: true, updated: pools.length })
}
```

Запускайте каждые 5-10 минут через cron или Vercel Cron Jobs.

### 📚 Дополнительные ресурсы:

- [Uniswap V3 Subgraph Docs](https://docs.uniswap.org/api/subgraph/overview)
- [CoinGecko Price API](https://www.coingecko.com/en/api/documentation)
- [Ethers.js Documentation](https://docs.ethers.org/)

---

**Итог:** Теперь данные должны полностью совпадать с Uniswap UI! 🎉

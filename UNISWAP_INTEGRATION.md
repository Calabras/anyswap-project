# Uniswap V3 Integration Guide

## Обзор

Интеграция с Uniswap V3 API для работы с реальными пулами ликвидности через The Graph API.

## Что реализовано

### 1. Интеграция с The Graph API (`lib/uniswap/api.ts`)

- **`fetchUniswapPoolData`** - Получение данных о пуле по адресу
- **`fetchPoolFromUrl`** - Парсинг URL Uniswap и получение данных
- **`parseUniswapUrl`** - Извлечение адреса пула из URL
- **`searchPoolsByTokens`** - Поиск пулов по символам токенов

### 2. Интеграция с Binance API (`lib/binance/api.ts`)

- **`getBinancePrice`** - Получение текущей цены криптовалюты
- **`convertToUSDT`** - Конвертация криптовалюты в USDT
- **`getMultiplePrices`** - Получение нескольких цен одновременно

### 3. API Endpoints

#### `/api/pools` (GET)
Получение списка пулов с фильтрацией:
- `network` - фильтр по сети
- `tvlMin`, `tvlMax` - фильтр по TVL
- `feeMin`, `feeMax` - фильтр по комиссиям
- `aprMin`, `aprMax` - фильтр по APR

#### `/api/pools/update` (POST)
Обновление данных одного пула из Uniswap

#### `/api/pools/update` (PUT)
Обновление всех пулов из Uniswap

#### `/api/admin/pools` (POST)
Добавление нового пула через Uniswap URL

## Как использовать

### Добавление пула через админ панель

1. Войдите в админ панель
2. Перейдите в раздел "Pools"
3. Нажмите "Add Pool"
4. Вставьте URL пула с Uniswap.org (например: `https://app.uniswap.org/pools/0x...`)
5. Система автоматически:
   - Распарсит URL
   - Получит данные о пуле из The Graph API
   - Сохранит пул в базу данных

### Обновление данных пулов

Данные пулов можно обновить вручную через API:

```bash
# Обновить один пул
POST /api/pools/update
{
  "poolId": "uuid"
}

# Обновить все пулы
PUT /api/pools/update
```

### Получение пулов на главной странице

Главная страница автоматически загружает пулы из базы данных через `/api/pools`.

Фильтры применяются на сервере для оптимизации производительности.

## Поддерживаемые сети

- **Ethereum** (ERC20) - основной
- **Polygon** (POLYGON)
- **Arbitrum** (ARBITRUM)
- **Optimism** (OPTIMISM)
- **Base** (BASE)

## The Graph API Endpoints

⚠️ **ВАЖНО:** Публичные endpoints The Graph больше не работают. Необходимо настроить API ключ.

### Настройка API ключа

См. подробную инструкцию в файле `GRAPH_API_SETUP.md`

**Быстрая настройка:**

1. Зарегистрируйтесь на https://thegraph.com/studio/
2. Получите API ключ
3. Добавьте в `.env`:
   ```env
   NEXT_PUBLIC_GRAPH_API_KEY=your_api_key_here
   ```

### Endpoints (автоматически формируются с API ключом)

- Ethereum: `https://gateway-arbitrum.network.thegraph.com/api/{API_KEY}/subgraphs/id/{SUBGRAPH_ID}`
- Polygon: `https://gateway-arbitrum.network.thegraph.com/api/{API_KEY}/subgraphs/id/{SUBGRAPH_ID}`
- Arbitrum: `https://gateway-arbitrum.network.thegraph.com/api/{API_KEY}/subgraphs/id/{SUBGRAPH_ID}`
- Optimism: `https://gateway-arbitrum.network.thegraph.com/api/{API_KEY}/subgraphs/id/{SUBGRAPH_ID}`
- Base: `https://gateway-arbitrum.network.thegraph.com/api/{API_KEY}/subgraphs/id/{SUBGRAPH_ID}`

### Старые endpoints (больше не работают)

- ~~Ethereum: `https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3`~~
- ~~Polygon: `https://api.thegraph.com/subgraphs/name/ianlapham/uniswap-v3-polygon`~~
- ~~Arbitrum: `https://api.thegraph.com/subgraphs/name/ianlapham/arbitrum-minimal`~~
- ~~Optimism: `https://api.thegraph.com/subgraphs/name/ianlapham/optimism-post-regenesis`~~
- ~~Base: `https://api.thegraph.com/subgraphs/name/ianlapham/base-v3`~~

## Структура данных пула

```typescript
interface UniswapPoolData {
  poolAddress: string
  network: string
  token0: {
    symbol: string
    address: string
    name?: string
    decimals: number
  }
  token1: {
    symbol: string
    address: string
    name?: string
    decimals: number
  }
  feeTier: number
  tvl: number
  volume24h: number
  fees24h: number
  apr: number
  sqrtPrice?: string
  tick?: number
  liquidity?: string
}
```

## Следующие шаги

1. ✅ Интеграция с The Graph API
2. ✅ Получение данных о пулах
3. ✅ Обновление данных пулов
4. ⏳ Создание позиций через Uniswap SDK
5. ⏳ Сбор комиссий
6. ⏳ Закрытие позиций

## Примечания

- ⚠️ **ОБЯЗАТЕЛЬНО:** The Graph API требует API ключ. Публичные endpoints больше не работают.
- См. `GRAPH_API_SETUP.md` для подробной инструкции по настройке
- The Graph API может иметь ограничения по частоте запросов
- Для production обязательно используйте API ключ The Graph
- Данные обновляются в реальном времени при добавлении пула
- Рекомендуется периодически обновлять данные пулов (например, раз в час)

## Решение проблем

### Ошибка: "This endpoint has been removed"
**Решение:** Настройте API ключ The Graph (см. `GRAPH_API_SETUP.md`)

### Ошибка: "Invalid API key"
**Решение:** Проверьте правильность API ключа в `.env` файле

### Ошибка: "Rate limit exceeded"
**Решение:** The Graph имеет лимиты на запросы. Используйте кэширование или платный план


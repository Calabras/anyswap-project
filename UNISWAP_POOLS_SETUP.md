# 🚀 НАСТРОЙКА ИМПОРТА ПУЛОВ UNISWAP V3

## 📋 Оглавление
- [Введение](#введение)
- [Быстрый старт](#быстрый-старт)
- [Настройка The Graph API](#настройка-the-graph-api)
- [Настройка базы данных](#настройка-базы-данных)
- [Использование](#использование)
- [Решение проблем](#решение-проблем)

## Введение

Эта система позволяет импортировать пулы ликвидности из Uniswap V3 в вашу базу данных для управления через админ-панель.

### Поддерживаемые сети:
- ✅ **Ethereum Mainnet** (работает без API ключа)
- ✅ **Polygon** (работает без API ключа)
- ✅ **Arbitrum** (работает без API ключа)
- ✅ **Optimism** (работает без API ключа)
- ⚠️ **Base** (требует API ключ)
- ⚠️ **Sepolia** (требует API ключ)

## Быстрый старт

### 1. Установка зависимостей

```bash
# Установите все необходимые пакеты
npm install

# Установите GraphQL зависимости (если еще не установлены)
npm install graphql graphql-request
```

### 2. Настройка переменных окружения

Создайте файл `.env.local` в корне проекта:

```env
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/anyswap

# Web3 - Alchemy API
NEXT_PUBLIC_ALCHEMY_ID=your_alchemy_api_key

# The Graph API (НЕОБЯЗАТЕЛЬНО для публичных endpoints)
# Получите ключ на https://thegraph.com/studio/
NEXT_PUBLIC_GRAPH_API_KEY=

# JWT Secret
JWT_SECRET=your_random_secret_key_here

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret_key
```

### 3. Настройка базы данных

```bash
# Генерация Prisma Client
npx prisma generate

# Создание таблиц в базе данных
npx prisma db push

# (Опционально) Откройте Prisma Studio для просмотра данных
npx prisma studio
```

### 4. Запуск проекта

```bash
npm run dev
```

Откройте http://localhost:3000/admin

## Настройка The Graph API

### Публичные endpoints (БЕЗ API ключа)

Для сетей **Ethereum Mainnet**, **Polygon**, **Arbitrum**, и **Optimism** можно использовать публичные endpoints БЕЗ API ключа. Они работают из коробки!

```typescript
const GRAPH_ENDPOINTS = {
  mainnet: 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3',
  polygon: 'https://api.thegraph.com/subgraphs/name/ianlapham/uniswap-v3-polygon',
  arbitrum: 'https://api.thegraph.com/subgraphs/name/ianlapham/arbitrum-minimal',
  optimism: 'https://api.thegraph.com/subgraphs/name/ianlapham/optimism-post-regenesis'
};
```

### Получение API ключа (для Base и Sepolia)

Если вы хотите использовать **Base** или **Sepolia**, вам нужен API ключ:

#### Шаг 1: Регистрация на The Graph

1. Перейдите на https://thegraph.com/studio/
2. Зарегистрируйтесь или войдите через GitHub
3. Создайте бесплатный аккаунт

#### Шаг 2: Создание API ключа

1. В левом меню выберите **"API Keys"**
2. Нажмите **"Create API Key"**
3. Дайте ключу имя (например, "AnySwap Production")
4. Скопируйте созданный ключ

#### Шаг 3: Настройка прав доступа

1. После создания ключа, нажмите на него
2. В разделе **"Subgraphs"** добавьте:
   - `Uniswap v3 (Base)`
   - `Uniswap v3 (Sepolia)`
3. Установите лимиты:
   - **Query Depth Limit**: 10
   - **Rate Limit**: 1000 queries per hour (для бесплатного тарифа)

#### Шаг 4: Добавьте ключ в .env.local

```env
NEXT_PUBLIC_GRAPH_API_KEY=your_api_key_here
```

## Настройка базы данных

Проект использует **PostgreSQL** с **Prisma ORM**.

### Структура таблиц

```sql
-- Pool: Основная таблица пулов
CREATE TABLE Pool (
  id              TEXT PRIMARY KEY,
  address         TEXT NOT NULL,
  network         TEXT NOT NULL,
  token0Address   TEXT NOT NULL,
  token0Symbol    TEXT NOT NULL,
  token0Name      TEXT NOT NULL,
  token0Decimals  INT NOT NULL,
  token1Address   TEXT NOT NULL,
  token1Symbol    TEXT NOT NULL,
  token1Name      TEXT NOT NULL,
  token1Decimals  INT NOT NULL,
  fee             INT NOT NULL,
  liquidity       TEXT NOT NULL,
  sqrtPriceX96    TEXT NOT NULL,
  tick            INT,
  volumeUSD       FLOAT DEFAULT 0,
  tvlUSD          FLOAT DEFAULT 0,
  txCount         INT DEFAULT 0,
  isActive        BOOLEAN DEFAULT true,
  createdAt       TIMESTAMP DEFAULT NOW(),
  updatedAt       TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(address, network)
);

-- PoolDayData: Исторические данные пулов
CREATE TABLE PoolDayData (
  id              TEXT PRIMARY KEY,
  poolId          TEXT NOT NULL,
  date            TIMESTAMP NOT NULL,
  volumeUSD       FLOAT DEFAULT 0,
  volumeToken0    FLOAT DEFAULT 0,
  volumeToken1    FLOAT DEFAULT 0,
  tvlUSD          FLOAT DEFAULT 0,
  feesUSD         FLOAT DEFAULT 0,
  txCount         INT DEFAULT 0,
  open            FLOAT DEFAULT 0,
  high            FLOAT DEFAULT 0,
  low             FLOAT DEFAULT 0,
  close           FLOAT DEFAULT 0,
  
  UNIQUE(poolId, date),
  FOREIGN KEY (poolId) REFERENCES Pool(id)
);
```

### Индексы для производительности

```sql
CREATE INDEX idx_pool_network ON Pool(network);
CREATE INDEX idx_pool_tvl ON Pool(tvlUSD);
CREATE INDEX idx_pool_token0 ON Pool(token0Address);
CREATE INDEX idx_pool_token1 ON Pool(token1Address);
CREATE INDEX idx_poolday_date ON PoolDayData(date);
```

## Использование

### Импорт через админ-панель

#### 1. Откройте админ-панель

Перейдите на http://localhost:3000/admin и войдите как администратор.

#### 2. Перейдите в "Управление пулами"

Выберите вкладку **"Liquidity Pools"** в админ-панели.

#### 3. Выберите способ импорта

##### Вариант A: Импорт топ пулов (Рекомендуется)

1. Выберите сеть (например, **Ethereum Mainnet**)
2. Укажите количество пулов (например, **10**)
3. Нажмите **"Импортировать топ 10 пулов"**
4. Дождитесь завершения импорта

**Результат**: Импортируются топ пулы по TVL с актуальными данными

##### Вариант B: Импорт по адресу пула

1. Выберите сеть
2. Введите адрес пула (например, `0x8ad599c3a0ff1de082011efddc58f1908eb6e6d8`)
3. Нажмите кнопку импорта
4. Дождитесь подтверждения

**Результат**: Импортируется конкретный пул с историческими данными

##### Вариант C: Поиск по токенам

1. Выберите сеть
2. Введите адрес токена 0 и/или токена 1
3. Нажмите **"Найти пулы"**
4. Выберите нужный пул из результатов

**Результат**: Показывается список пулов с указанными токенами

### Примеры адресов пулов для тестирования

#### Ethereum Mainnet

```
USDC/ETH 0.3%:  0x8ad599c3a0ff1de082011efddc58f1908eb6e6d8
WBTC/ETH 0.3%:  0xcbcdf9626bc03e24f779434178a73a0b4bad62ed
DAI/USDC 0.01%: 0x5777d92f208679db4b9778590fa3cab3ac9e2168
```

#### Polygon

```
USDC/USDT 0.01%:  0xdac8a8e6dbf8c690ec6815e0ff03491b2770255d
WMATIC/USDC 0.3%: 0xa374094527e1673a86de625aa59517c5de346d32
```

### Импорт через API

#### Импорт одного пула

```javascript
const response = await fetch('/api/admin/pools/import', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'import-single',
    poolAddress: '0x8ad599c3a0ff1de082011efddc58f1908eb6e6d8',
    network: 'mainnet'
  })
});

const data = await response.json();
console.log('Imported pool:', data.pool);
```

#### Импорт топ пулов

```javascript
const response = await fetch('/api/admin/pools/import', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'import-top',
    network: 'mainnet',
    limit: 10
  })
});

const data = await response.json();
console.log(`Imported ${data.imported} pools`);
```

#### Обновление данных пула

```javascript
const response = await fetch('/api/admin/pools/import', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'update',
    poolAddress: '0x8ad599c3a0ff1de082011efddc58f1908eb6e6d8',
    network: 'mainnet'
  })
});
```

## Решение проблем

### Ошибка: "Failed to fetch pool data"

**Причина**: Неправильный адрес пула или проблемы с The Graph API

**Решение**:
1. Проверьте, что адрес пула правильный (42 символа, начинается с `0x`)
2. Убедитесь, что выбрана правильная сеть
3. Проверьте логи в терминале для деталей

### Ошибка: "Pool not found"

**Причина**: Пул не существует на указанной сети

**Решение**:
1. Проверьте адрес пула на Etherscan/Polygonscan
2. Убедитесь, что это именно пул Uniswap V3
3. Попробуйте другую сеть

### Ошибка: "Network error"

**Причина**: Проблемы с подключением к The Graph API

**Решение**:
1. Проверьте интернет-соединение
2. Попробуйте использовать VPN (иногда The Graph блокируется)
3. Подождите несколько минут и попробуйте снова

### Ошибка: "Database connection failed"

**Причина**: PostgreSQL не запущен или неправильная конфигурация

**Решение**:
1. Убедитесь, что PostgreSQL запущен:
   ```bash
   # Mac/Linux
   sudo service postgresql status
   
   # Windows
   pg_ctl status
   ```
2. Проверьте `DATABASE_URL` в `.env.local`
3. Создайте базу данных:
   ```bash
   createdb anyswap
   ```
4. Выполните миграции:
   ```bash
   npx prisma db push
   ```

### Ошибка: "API key required"

**Причина**: Пытаетесь использовать Base или Sepolia без API ключа

**Решение**:
1. Получите API ключ на https://thegraph.com/studio/
2. Добавьте его в `.env.local`:
   ```env
   NEXT_PUBLIC_GRAPH_API_KEY=your_api_key
   ```
3. Перезапустите сервер разработки

### Медленная загрузка данных

**Причина**: The Graph API может быть перегружен

**Решение**:
1. Используйте меньшее количество пулов при импорте
2. Импортируйте пулы по одному
3. Создайте свой API ключ для увеличения лимитов

## Дополнительная информация

### Структура проекта

```
anyswap-project/
├── app/
│   ├── api/
│   │   ├── admin/
│   │   │   └── pools/
│   │   │       ├── route.ts              # Управление пулами
│   │   │       └── import/
│   │   │           └── route.ts          # Импорт пулов
│   │   └── pools/
│   │       └── route.ts                  # Публичный API пулов
│   ├── pools/
│   │   └── page.tsx                      # Страница пулов для пользователей
│   └── admin/
│       └── page.tsx                      # Админ панель
├── components/
│   └── admin/
│       └── PoolManagement.tsx            # Компонент управления пулами
├── lib/
│   ├── uniswap/
│   │   └── graphql-client.ts             # GraphQL клиент для The Graph
│   └── prisma.ts                         # Prisma клиент
├── prisma/
│   └── schema.prisma                     # Схема базы данных
└── .env.local                            # Переменные окружения
```

### Автоматическое обновление данных

Для автоматического обновления данных пулов создайте cron job:

```javascript
// lib/scheduler/update-pools.ts
import cron from 'node-cron';

// Обновление каждые 5 минут
cron.schedule('*/5 * * * *', async () => {
  const pools = await prisma.pool.findMany({
    where: { isActive: true },
    select: { address: true, network: true }
  });

  for (const pool of pools) {
    await fetch('http://localhost:3000/api/admin/pools/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update',
        poolAddress: pool.address,
        network: pool.network
      })
    });
  }

  console.log(`Updated ${pools.length} pools`);
});
```

### Полезные ссылки

- [The Graph Documentation](https://thegraph.com/docs/)
- [Uniswap V3 Documentation](https://docs.uniswap.org/contracts/v3/overview)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Next.js Documentation](https://nextjs.org/docs)

## Поддержка

Если у вас возникли проблемы:

1. Проверьте логи в консоли браузера (F12)
2. Проверьте логи сервера в терминале
3. Убедитесь, что все переменные окружения настроены правильно
4. Попробуйте удалить `node_modules` и переустановить зависимости:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

## Лицензия

MIT


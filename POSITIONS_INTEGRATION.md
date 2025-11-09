# Интеграция позиций через Uniswap SDK

## Что реализовано

### 1. API Endpoints

#### Создание позиции
- **Endpoint:** `POST /api/positions/create`
- **Описание:** Создает новую позицию ликвидности через Uniswap SDK
- **Параметры:**
  - `poolId` - ID пула из базы данных
  - `amountUSD` - Сумма в USD
  - `minPrice` - Минимальная цена (опционально)
  - `maxPrice` - Максимальная цена (опционально)
  - `isFullRange` - Использовать полный диапазон

#### Сбор комиссий
- **Endpoint:** `POST /api/positions/collect-fees`
- **Описание:** Собирает накопленные комиссии с позиции
- **Параметры:**
  - `positionId` - ID позиции

#### Закрытие позиции
- **Endpoint:** `POST /api/positions/close`
- **Описание:** Закрывает позицию и возвращает средства + комиссии
- **Параметры:**
  - `positionId` - ID позиции
  - `collectFees` - Собрать комиссии перед закрытием (по умолчанию true)

#### Список позиций
- **Endpoint:** `GET /api/positions/list?status=active`
- **Описание:** Получает список позиций пользователя
- **Параметры:**
  - `status` - Статус позиций (active/closed)

### 2. Библиотека для работы с Uniswap SDK

**Файл:** `lib/uniswap/positions.ts`

Содержит функции:
- `createPositionData()` - Создание данных позиции
- `collectFeesData()` - Сбор комиссий
- `closePositionData()` - Закрытие позиции
- `priceToTick()` / `tickToPrice()` - Конвертация цены в тики
- `calculateTickRange()` - Расчет диапазона тиков

### 3. Страницы

#### Страница пула (`app/pool/[id]/page.tsx`)
- Отображает информацию о пуле
- Форма для создания позиции
- Расчет ожидаемого APR на основе ценового диапазона
- Интеграция с API для создания позиций

#### Страница позиций (`app/positions/page.tsx`)
- Список активных позиций пользователя
- Кнопки для сбора комиссий
- Кнопки для закрытия позиций
- Отображение собранных комиссий

## Что нужно дополнительно подключить

### 1. Интеграция с реальными контрактами Uniswap

**Текущее состояние:** Функции в `lib/uniswap/positions.ts` возвращают упрощенные данные. Для production нужно:

1. **Подключить ethers.js или viem** для взаимодействия с контрактами:
   ```bash
   npm install ethers@^6.9.0
   # или
   npm install viem@^2.0.0
   ```

2. **Адреса контрактов Uniswap V3:**
   - NonfungiblePositionManager: `0xC36442b4a4522E871399CD717aBDD847Ab11FE88` (Ethereum Mainnet)
   - Pool Factory: `0x1F98431c8aD98523631AE4a59f267346ea31F984`

3. **Обновить функции в `lib/uniswap/positions.ts`:**
   - Использовать реальные вызовы контрактов вместо mock данных
   - Вызывать `mint()` для создания позиции
   - Вызывать `collect()` для сбора комиссий
   - Вызывать `decreaseLiquidity()` + `collect()` для закрытия

### 2. Получение текущей цены пула

**Текущее состояние:** Используется значение по умолчанию (1)

**Что нужно:**
- Запрашивать `sqrtPriceX96` из контракта пула
- Конвертировать в реальную цену: `price = (sqrtPriceX96 / 2^96)^2`

### 3. Автоматический сбор комиссий

**Рекомендация:** Создать cron job или фоновую задачу для периодического сбора комиссий:
- Проверять позиции каждые N минут/часов
- Автоматически собирать комиссии если они превышают порог
- Уведомлять пользователей о собранных комиссиях

### 4. Обработка транзакций

**Текущее состояние:** Транзакции логируются в БД, но не отправляются в блокчейн

**Что нужно:**
- Интегрировать с провайдером (Alchemy, Infura, или собственный нод)
- Отправлять транзакции через кошелек пользователя (MetaMask, WalletConnect)
- Отслеживать статус транзакций
- Обрабатывать ошибки и откаты транзакций

### 5. Безопасность

**Важно:**
- Никогда не храните приватные ключи на сервере
- Все транзакции должны подписываться кошельком пользователя
- Используйте rate limiting для API endpoints
- Валидируйте все входные данные

### 6. Тестирование

**Рекомендации:**
- Использовать тестовые сети (Goerli, Sepolia) для разработки
- Написать unit тесты для функций расчета
- Использовать mock контракты для интеграционных тестов

## Пример использования

### Создание позиции (клиентская сторона)

```typescript
const response = await fetch('/api/positions/create', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    poolId: 'pool-uuid',
    amountUSD: 1000,
    minPrice: 1000,
    maxPrice: 2000,
    isFullRange: false,
  }),
})
```

### Сбор комиссий

```typescript
const response = await fetch('/api/positions/collect-fees', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    positionId: 'position-uuid',
  }),
})
```

### Закрытие позиции

```typescript
const response = await fetch('/api/positions/close', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    positionId: 'position-uuid',
    collectFees: true,
  }),
})
```

## Следующие шаги

1. ✅ Базовая структура API endpoints
2. ✅ Страницы для создания и управления позициями
3. ✅ Интеграция с базой данных
4. ⏳ Интеграция с реальными контрактами Uniswap
5. ⏳ Обработка транзакций через кошелек
6. ⏳ Автоматический сбор комиссий
7. ⏳ Мониторинг и уведомления


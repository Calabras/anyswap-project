# The Graph API Setup Guide

## Проблема

Публичные endpoints The Graph (`https://api.thegraph.com/subgraphs/name/...`) больше не работают. Они были удалены или требуют аутентификации.

## Решение: Использование готовых Uniswap Subgraphs (Рекомендуется)

**ВАЖНО:** Для получения данных о пулах Uniswap V3 **НЕ нужно создавать свой subgraph**. Можно использовать готовые публичные subgraphs Uniswap через The Graph Studio.

### Вариант 1: Использование готовых Uniswap Subgraphs (Самый простой)

1. **Зарегистрируйтесь на The Graph Studio:**
   - Перейдите на https://thegraph.com/studio/
   - Войдите через GitHub или создайте аккаунт

2. **Получите API ключ:**
   - В Studio нажмите на ваш профиль (правый верхний угол)
   - Перейдите в раздел **"API Keys"** или **"My API Keys"**
   - Нажмите **"Create API Key"** или используйте существующий
   - Скопируйте **API Key** (это строка вида `f68264-55fff4`)

3. **Используйте готовые Uniswap Subgraph IDs:**
   - Для Ethereum: `QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco`
   - Для других сетей см. ниже

4. **Сформируйте Query URL:**
   - Формат: `https://gateway-arbitrum.network.thegraph.com/api/[YOUR_API_KEY]/subgraphs/id/[SUBGRAPH_ID]`
   - Пример: `https://gateway-arbitrum.network.thegraph.com/api/f68264-55fff4/subgraphs/id/QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco`

### Вариант 2: Создание своего Subgraph (Если нужно)

Если вы уже создали свой Subgraph в Studio:

1. **Выберите сеть:**
   - В интерфейсе Studio выберите нужную сеть (Ethereum, Arbitrum, Polygon и т.д.)
   - Для каждой сети нужен отдельный subgraph

2. **Получите Query URL:**
   - После создания subgraph перейдите на вкладку **"Endpoints"** или **"Query"**
   - Скопируйте **Query URL** - это ваш endpoint для использования в приложении
   - Формат: `https://gateway-arbitrum.network.thegraph.com/api/[YOUR_API_KEY]/subgraphs/id/[SUBGRAPH_ID]`

3. **Для разных сетей:**
   - Создайте отдельный subgraph для каждой сети (Ethereum, Polygon, Arbitrum и т.д.)
   - Или используйте готовые Uniswap subgraphs (см. Вариант 1)

### Вариант 2: Децентрализованная сеть The Graph

1. **Используйте децентрализованную сеть:**
   - URL формат: `https://gateway-arbitrum.network.thegraph.com/api/[API_KEY]/subgraphs/id/[SUBGRAPH_ID]`
   - Требуется API ключ от The Graph

2. **Получите API ключ:**
   - Зарегистрируйтесь на https://thegraph.com/
   - Перейдите в раздел "API Keys"
   - Создайте новый ключ
   - Скопируйте ключ

### Вариант 3: Использование RPC напрямую (Альтернатива)

Если The Graph API недоступен, можно получать данные напрямую через RPC:

1. **Используйте публичные RPC endpoints:**
   - Ethereum: `https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY` или `https://mainnet.infura.io/v3/YOUR_KEY`
   - Polygon: `https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY`
   - Arbitrum: `https://arb-mainnet.g.alchemy.com/v2/YOUR_KEY`

2. **Читайте данные из смарт-контрактов напрямую:**
   - Используйте ethers.js или viem для чтения данных из пулов
   - Адреса контрактов Uniswap V3:
     - Factory: `0x1F98431c8aD98523631AE4a59f267346ea31F984`
     - Pool: определяется через Factory

## Настройка в проекте

### Шаг 1: Получите API ключ

1. В The Graph Studio перейдите в раздел **"API Keys"** (в меню профиля)
2. Создайте новый API ключ или используйте существующий
3. Скопируйте ключ (например: `f68264-55fff4`)

### Шаг 2: Получите Subgraph IDs для Uniswap V3

**Вариант A: Используйте готовые Uniswap Subgraphs (Рекомендуется)**

Для каждой сети используйте готовые subgraph IDs:

- **Ethereum:** `QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco`
- **Polygon:** Найдите на https://thegraph.com/hosted-service/subgraph/ianlapham/uniswap-v3-polygon
- **Arbitrum:** Найдите на https://thegraph.com/hosted-service/subgraph/ianlapham/arbitrum-minimal
- **Optimism:** Найдите на https://thegraph.com/hosted-service/subgraph/ianlapham/optimism-post-regenesis
- **Base:** Найдите на https://thegraph.com/hosted-service/subgraph/ianlapham/base-v3

**Вариант B: Используйте свой созданный Subgraph**

1. В Studio перейдите на страницу вашего subgraph
2. Нажмите на вкладку **"Endpoints"** или **"Query"**
3. Скопируйте **Subgraph ID** из URL или из интерфейса
4. Используйте этот ID для соответствующей сети

### Шаг 3: Добавьте в `.env`

**ВАЖНО:** После создания Subgraph в Studio вам нужно получить его **Subgraph ID**:

1. В Studio перейдите на страницу вашего Subgraph
2. Нажмите на вкладку **"Query"** или **"Endpoints"**
3. Найдите **Subgraph ID** (это строка вида `Qm...` или `0x...`)
4. Скопируйте этот ID

**Вариант 1: Использование вашего Subgraph из Studio (Рекомендуется)**

```env
# The Graph API Configuration
NEXT_PUBLIC_GRAPH_API_KEY=your_api_key_from_studio
NEXT_PUBLIC_GRAPH_ETHEREUM_SUBGRAPH_ID=your_subgraph_id_from_studio
```

Если вы создали Subgraph для других сетей, добавьте их тоже:
```env
NEXT_PUBLIC_GRAPH_POLYGON_SUBGRAPH_ID=your_polygon_subgraph_id
NEXT_PUBLIC_GRAPH_ARBITRUM_SUBGRAPH_ID=your_arbitrum_subgraph_id
# и т.д.
```

**Вариант 2: Использование готовых Uniswap Subgraphs (если они доступны)**

Если вы хотите использовать готовые Uniswap Subgraphs, вам все равно нужен API ключ и правильный Subgraph ID:
```env
NEXT_PUBLIC_GRAPH_API_KEY=your_api_key_from_studio
NEXT_PUBLIC_GRAPH_ETHEREUM_SUBGRAPH_ID=correct_uniswap_subgraph_id
```

**Примечание:** Старые Subgraph IDs из hosted service (например, `QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco`) не работают в децентрализованной сети. Используйте Subgraph ID из Studio.

**Или укажите полные URLs для каждой сети:**

```env
# The Graph API Configuration
# Вариант 1: Только API ключ (автоматически формирует URLs)
NEXT_PUBLIC_GRAPH_API_KEY=your_api_key_here

# Вариант 2: Полные URLs для каждой сети (если используете свои subgraphs)
NEXT_PUBLIC_GRAPH_ETHEREUM_URL=https://gateway-arbitrum.network.thegraph.com/api/YOUR_KEY/subgraphs/id/YOUR_SUBGRAPH_ID
NEXT_PUBLIC_GRAPH_POLYGON_URL=https://gateway-arbitrum.network.thegraph.com/api/YOUR_KEY/subgraphs/id/YOUR_SUBGRAPH_ID
NEXT_PUBLIC_GRAPH_ARBITRUM_URL=https://gateway-arbitrum.network.thegraph.com/api/YOUR_KEY/subgraphs/id/YOUR_SUBGRAPH_ID
NEXT_PUBLIC_GRAPH_OPTIMISM_URL=https://gateway-arbitrum.network.thegraph.com/api/YOUR_KEY/subgraphs/id/YOUR_SUBGRAPH_ID
NEXT_PUBLIC_GRAPH_BASE_URL=https://gateway-arbitrum.network.thegraph.com/api/YOUR_KEY/subgraphs/id/YOUR_SUBGRAPH_ID
```

### 2. Обновите код для использования API ключа:

Код автоматически использует переменные окружения, если они установлены.

### 3. Альтернативные endpoints (без API ключа):

Если у вас нет API ключа, можно использовать альтернативные источники:

1. **Uniswap Info API** (ограниченный):
   - `https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3` (может не работать)
   
2. **Прямое чтение из контрактов** (требует RPC):
   - Используйте ethers.js для чтения данных из пулов
   - Более медленно, но не требует API ключа

## Subgraph IDs для Uniswap V3 (Готовые публичные subgraphs)

### Как найти Subgraph ID:

1. Перейдите на https://thegraph.com/hosted-service/
2. Найдите нужный subgraph (например, "Uniswap V3")
3. Откройте страницу subgraph
4. Subgraph ID будет в URL или в разделе "Details"

### Известные Subgraph IDs:

**Ethereum Mainnet:**
- Subgraph: `uniswap/uniswap-v3`
- Subgraph ID: `QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco`
- URL: https://thegraph.com/hosted-service/subgraph/uniswap/uniswap-v3

**Polygon:**
- Subgraph: `ianlapham/uniswap-v3-polygon`
- URL: https://thegraph.com/hosted-service/subgraph/ianlapham/uniswap-v3-polygon
- Subgraph ID: Найдите на странице subgraph

**Arbitrum:**
- Subgraph: `ianlapham/arbitrum-minimal`
- URL: https://thegraph.com/hosted-service/subgraph/ianlapham/arbitrum-minimal
- Subgraph ID: Найдите на странице subgraph

**Optimism:**
- Subgraph: `ianlapham/optimism-post-regenesis`
- URL: https://thegraph.com/hosted-service/subgraph/ianlapham/optimism-post-regenesis
- Subgraph ID: Найдите на странице subgraph

**Base:**
- Subgraph: `ianlapham/base-v3`
- URL: https://thegraph.com/hosted-service/subgraph/ianlapham/base-v3
- Subgraph ID: Найдите на странице subgraph

**Примечание:** Если вы создали свой subgraph в Studio, используйте его Subgraph ID из интерфейса Studio.

## Проверка работы

После настройки API ключа:

1. **Добавьте API ключ в `.env`:**
   ```env
   NEXT_PUBLIC_GRAPH_API_KEY=your_api_key_here
   ```

2. **Перезапустите сервер:**
   ```bash
   npm run dev
   ```

3. **Попробуйте добавить пул через админ-панель:**
   - Войдите в админ-панель
   - Перейдите в раздел "Pools"
   - Нажмите "Add Pool"
   - Вставьте URL пула Uniswap (например: `https://app.uniswap.org/explore/pools/ethereum/0x...`)

4. **Проверьте логи:**
   - Если есть ошибки, проверьте правильность API ключа
   - Убедитесь, что Subgraph ID правильный для выбранной сети

## Быстрый старт (Минимальная настройка)

Если вы только что создали Subgraph в Studio:

1. **Скопируйте API ключ:**
   - В Studio: Профиль → API Keys → Скопируйте ключ (например: `f68264-55fff4`)

2. **Скопируйте Subgraph ID из Studio:**
   - В Studio перейдите на страницу вашего Subgraph
   - Нажмите на вкладку **"Query"** или **"Endpoints"**
   - Найдите **Subgraph ID** - это строка вида `Qm...` или `0x...`
   - **ВАЖНО:** Это НЕ тот же ID, что был в hosted service! Это новый ID из Studio
   - Скопируйте этот ID

3. **Добавьте в `.env`:**
   ```env
   # The Graph API Configuration
   NEXT_PUBLIC_GRAPH_API_KEY=ваш_ключ_из_studio
   NEXT_PUBLIC_GRAPH_ETHEREUM_SUBGRAPH_ID=ваш_subgraph_id_из_studio
   ```

4. **Для разных сетей:**
   - Если вы создали Subgraph для Ethereum, используйте его ID для `NEXT_PUBLIC_GRAPH_ETHEREUM_SUBGRAPH_ID`
   - Если вы создали Subgraph для других сетей, добавьте их тоже:
     ```env
     NEXT_PUBLIC_GRAPH_POLYGON_SUBGRAPH_ID=ваш_polygon_subgraph_id
     NEXT_PUBLIC_GRAPH_ARBITRUM_SUBGRAPH_ID=ваш_arbitrum_subgraph_id
     ```

5. **Перезапустите сервер:**
   ```bash
   npm run dev
   ```

**Примечание:** Если вы видите ошибку "subgraph not found", это означает, что Subgraph ID неверный. Убедитесь, что вы скопировали правильный ID из Studio, а не старый ID из hosted service.

## Troubleshooting

### Ошибка: "This endpoint has been removed"
- **Решение:** Используйте новый endpoint с API ключом и правильным Subgraph ID
- Убедитесь, что API ключ правильно указан в `.env`
- Убедитесь, что Subgraph ID правильный (из Studio, а не из hosted service)

### Ошибка: "subgraph not found: invalid subgraph ID"
- **Решение:** 
  - Убедитесь, что вы используете правильный Subgraph ID из Studio
  - Старые Subgraph IDs из hosted service (например, `QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco`) не работают
  - Скопируйте новый Subgraph ID из Studio (вкладка "Query" или "Endpoints")
  - Добавьте его в `.env` как `NEXT_PUBLIC_GRAPH_ETHEREUM_SUBGRAPH_ID=ваш_id`

### Ошибка: "Invalid API key"
- **Решение:** Проверьте правильность API ключа
- Убедитесь, что ключ активен в The Graph Studio
- Проверьте, что ключ правильно указан в `.env` (без пробелов, без кавычек)

### Ошибка: "Rate limit exceeded"
- **Решение:** The Graph имеет лимиты на запросы
- Используйте кэширование данных
- Рассмотрите использование платного плана

## Полезные ссылки

- [The Graph Studio](https://thegraph.com/studio/)
- [The Graph Documentation](https://thegraph.com/docs/)
- [Uniswap V3 Subgraph](https://thegraph.com/hosted-service/subgraph/uniswap/uniswap-v3)
- [The Graph API Keys](https://thegraph.com/docs/en/querying/querying-from-an-application/)


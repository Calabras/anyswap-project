# Быстрый старт: Настройка The Graph API

## Что делать после создания Subgraph в Studio

### Шаг 1: Получите API ключ

1. В The Graph Studio нажмите на **ваш профиль** (правый верхний угол)
2. Выберите **"API Keys"** или **"My API Keys"**
3. Нажмите **"Create API Key"** (если еще нет)
4. Скопируйте **API Key** (например: `f68264-55fff4`)

**Важно:** Один API ключ работает для всех ваших subgraphs и всех сетей!

### Шаг 2: Получите Subgraph ID

**Вариант A: Используйте готовые Uniswap Subgraphs (Рекомендуется)**

Для получения данных о пулах Uniswap **НЕ нужно создавать свой subgraph**. Используйте готовые:

- **Ethereum:** ID = `QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco`
- **Polygon, Arbitrum, Optimism, Base:** Найдите на https://thegraph.com/hosted-service/

**Вариант B: Используйте свой созданный Subgraph**

1. В Studio откройте страницу вашего subgraph (ANYSWAPPER)
2. Найдите **Subgraph ID**:
   - В URL страницы (после `/subgraph/`)
   - Или в разделе "Details" / "Info"
   - Или на вкладке "Endpoints" / "Query"
3. Скопируйте ID

**Примечание:** Если вы создали subgraph для одной сети (например, Arbitrum), вам нужно:
- Либо создать отдельные subgraphs для каждой сети (Ethereum, Polygon и т.д.)
- Либо использовать готовые Uniswap subgraphs для всех сетей (проще!)

### Шаг 3: Настройте `.env` файл

**Способ 1: Только API ключ (Автоматически для всех сетей)**

Откройте файл `.env` в корне проекта и добавьте:

```env
NEXT_PUBLIC_GRAPH_API_KEY=ваш_api_ключ_здесь
```

Код автоматически сформирует URLs для всех сетей используя готовые Uniswap subgraph IDs.

**Способ 2: Полные URLs для каждой сети (Если используете свои subgraphs)**

Если вы создали отдельные subgraphs для каждой сети:

```env
# API ключ (общий для всех)
NEXT_PUBLIC_GRAPH_API_KEY=ваш_api_ключ_здесь

# Или укажите полные URLs для каждой сети
NEXT_PUBLIC_GRAPH_ETHEREUM_URL=https://gateway-arbitrum.network.thegraph.com/api/ВАШ_КЛЮЧ/subgraphs/id/ВАШ_SUBGRAPH_ID_ETHEREUM
NEXT_PUBLIC_GRAPH_POLYGON_URL=https://gateway-arbitrum.network.thegraph.com/api/ВАШ_КЛЮЧ/subgraphs/id/ВАШ_SUBGRAPH_ID_POLYGON
NEXT_PUBLIC_GRAPH_ARBITRUM_URL=https://gateway-arbitrum.network.thegraph.com/api/ВАШ_КЛЮЧ/subgraphs/id/ВАШ_SUBGRAPH_ID_ARBITRUM
NEXT_PUBLIC_GRAPH_OPTIMISM_URL=https://gateway-arbitrum.network.thegraph.com/api/ВАШ_КЛЮЧ/subgraphs/id/ВАШ_SUBGRAPH_ID_OPTIMISM
NEXT_PUBLIC_GRAPH_BASE_URL=https://gateway-arbitrum.network.thegraph.com/api/ВАШ_КЛЮЧ/subgraphs/id/ВАШ_SUBGRAPH_ID_BASE
```

### Шаг 4: Перезапустите сервер

```bash
npm run dev
```

### Шаг 5: Проверьте работу

1. Войдите в админ-панель
2. Перейдите в раздел **"Pools"**
3. Нажмите **"Add Pool"**
4. Вставьте URL пула Uniswap, например:
   - `https://app.uniswap.org/explore/pools/ethereum/0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8`
   - `https://app.uniswap.org/explore/pools/arbitrum/0x...`

## Пример настройки

Если ваш API ключ: `f68264-55fff4`

И вы используете готовые Uniswap subgraphs:

```env
NEXT_PUBLIC_GRAPH_API_KEY=f68264-55fff4
```

Всё! Код автоматически сформирует правильные URLs:
- Ethereum: `https://gateway-arbitrum.network.thegraph.com/api/f68264-55fff4/subgraphs/id/QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco`
- И так далее для других сетей

## FAQ

### Нужно ли создавать отдельный subgraph для каждой сети?

**Нет!** Для получения данных о пулах Uniswap используйте готовые Uniswap subgraphs. Один API ключ + готовые subgraph IDs = работает для всех сетей.

### Что делать с созданным Subgraph (ANYSWAPPER)?

Вы можете:
1. **Удалить его** (если не нужен) - для работы с Uniswap пулами он не нужен
2. **Оставить для будущего** - если планируете создавать свой subgraph для других целей

### Где найти Subgraph ID для готовых Uniswap subgraphs?

1. Перейдите на https://thegraph.com/hosted-service/
2. Найдите subgraph (например, "Uniswap V3")
3. Откройте страницу subgraph
4. Subgraph ID будет в URL или в разделе "Details"

### Как проверить, что всё работает?

После настройки попробуйте добавить пул через админ-панель. Если видите ошибку:
- Проверьте правильность API ключа
- Убедитесь, что сервер перезапущен после изменения `.env`
- Проверьте логи в консоли браузера и терминале

## Полезные ссылки

- [The Graph Studio](https://thegraph.com/studio/)
- [Uniswap V3 Subgraph](https://thegraph.com/hosted-service/subgraph/uniswap/uniswap-v3)
- [The Graph API Documentation](https://thegraph.com/docs/en/querying/querying-from-an-application/)


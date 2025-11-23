# Создание позиций в Uniswap V3 через кошелек

Полноценная интеграция для создания ликвидности позиций в Uniswap V3 **напрямую через кошелек пользователя** (MetaMask/WalletConnect).

## 🔒 Безопасность

✅ **НЕ использует приватные ключи на сервере**
✅ Пользователь подписывает транзакции своим кошельком
✅ Calldata генерируется на сервере, но подписывается только пользователем
✅ Production-ready решение

## 🎯 Как это работает

```
[User] → [Frontend Form] → [API: prepare calldata] → [User Wallet] → [Uniswap V3]
```

1. **Пользователь вводит данные** (количество токенов, диапазон цен)
2. **Сервер подготавливает calldata** используя Uniswap SDK
3. **Пользователь подписывает транзакцию** своим кошельком (MetaMask/WalletConnect)
4. **Позиция создается в Uniswap V3**
5. **Показываем успешное подтверждение** с ссылкой на Etherscan

## 📂 Структура файлов

```
app/api/positions/prepare/route.ts    # API endpoint для подготовки calldata
hooks/useCreatePosition.ts             # React hook для создания позиции
components/modals/CreatePositionModal.tsx  # UI компонент (модалка)
```

## 🚀 Использование

### 1. Импортируйте компонент

```typescript
import CreatePositionModal from '@/components/modals/CreatePositionModal';

function YourPoolPage() {
  const [selectedPool, setSelectedPool] = useState<Pool | null>(null);
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      {/* Кнопка для открытия модалки */}
      <Button onClick={() => {
        setSelectedPool(pool);
        setShowModal(true);
      }}>
        Create Position
      </Button>

      {/* Модалка для создания позиции */}
      <CreatePositionModal
        pool={selectedPool}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      />
    </>
  );
}
```

### 2. Pool Interface

```typescript
interface Pool {
  id: string;
  address: string;
  network: string;  // 'mainnet' | 'arbitrum' | 'polygon' | 'optimism' | 'base'
  token0Symbol: string;
  token1Symbol: string;
  token0Address: string;
  token1Address: string;
  token0Decimals: number;
  token1Decimals: number;
  fee: number;  // В basis points (500 = 0.05%, 3000 = 0.3%, 10000 = 1%)
  tvlUSD: number;
  apr?: number;
}
```

## 🛠️ API Endpoint

### POST `/api/positions/prepare`

Подготавливает calldata для создания позиции в Uniswap V3.

**Request Body:**
```json
{
  "poolAddress": "0x...",
  "token0Address": "0x...",
  "token1Address": "0x...",
  "token0Decimals": 18,
  "token1Decimals": 6,
  "feeTier": 3000,
  "amount0Desired": "1000000000000000000",  // 1 ETH в wei
  "amount1Desired": "1000000",               // 1 USDC
  "isFullRange": true,                       // Full range или custom range
  "minPrice": 2000,                          // Только для custom range
  "maxPrice": 2500,                          // Только для custom range
  "network": "arbitrum",
  "userAddress": "0x...",
  "slippageTolerance": 0.5                   // В процентах (опционально, default 0.5%)
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "to": "0xC36442b4a4522E871399CD717aBDD847Ab11FE88",  // NonfungiblePositionManager
    "calldata": "0x...",                                   // Calldata для транзакции
    "value": "0",                                          // ETH value (если используется нативный ETH)
    "position": {
      "tickLower": -887220,
      "tickUpper": 887220,
      "liquidity": "1234567890",
      "amount0": "1.0",                                    // Форматированное количество
      "amount1": "1.0",
      "amount0Raw": "1000000000000000000",                 // Raw amount (с decimals)
      "amount1Raw": "1000000",
      "amount0Min": "995000000000000000",                  // С учетом slippage
      "amount1Min": "995000"
    },
    "priceRange": {
      "lower": 0.0001,
      "upper": 100000.0,
      "current": 2250.5
    },
    "deadline": 1234567890,
    "slippageTolerance": 0.5
  }
}
```

## 🎨 UI Features

### CreatePositionModal

**Features:**
- ✅ Ввод количества token0 и token1
- ✅ Выбор Full Range или Custom Range
- ✅ Настройка Slippage Tolerance
- ✅ Отображение информации о пуле (fee, TVL, APR)
- ✅ Статус создания позиции (Preparing → Confirming → Success)
- ✅ Обработка ошибок
- ✅ Ссылка на транзакцию в Explorer (Etherscan/Arbiscan/etc)
- ✅ Кнопка "Connect Wallet" если кошелек не подключен

**States:**
- `preparing` - Подготовка calldata через API
- `minting` - Ожидание подтверждения транзакции
- `completed` - Позиция создана успешно
- `error` - Произошла ошибка

## 🔧 useCreatePosition Hook

```typescript
const {
  createPosition,      // Функция для создания позиции
  status,              // Статус: { preparing, minting, completed, error }
  positionData,        // Данные созданной позиции
  txHash,              // Hash транзакции
  isSuccess,           // Успешно ли создана позиция
  reset,               // Сбросить состояние
} = useCreatePosition();

// Использование
await createPosition({
  poolAddress: '0x...',
  token0Address: '0x...',
  token1Address: '0x...',
  token0Decimals: 18,
  token1Decimals: 6,
  feeTier: 3000,
  amount0Desired: '1000000000000000000',
  amount1Desired: '1000000',
  isFullRange: true,
  network: 'arbitrum',
  slippageTolerance: 0.5,
});
```

## 📝 TODO: Token Approval

**ВАЖНО:** В текущей версии пропущен этап approve токенов для упрощения.

В production нужно добавить:

1. **Проверку allowance:**
```typescript
const token0Contract = new Contract(token0Address, ERC20_ABI, provider);
const allowance = await token0Contract.allowance(
  userAddress,
  NONFUNGIBLE_POSITION_MANAGER
);
```

2. **Approve если недостаточно:**
```typescript
if (allowance.lt(amount0Desired)) {
  const approveTx = await token0Contract.approve(
    NONFUNGIBLE_POSITION_MANAGER,
    amount0Desired
  );
  await approveTx.wait();
}
```

3. **Показывать статус approve в UI:**
```typescript
status: {
  preparing: false,
  approving: true,  // ← Добавить этот статус
  minting: false,
  completed: false,
}
```

## 🌐 Supported Networks

- ✅ Ethereum Mainnet
- ✅ Arbitrum
- ✅ Polygon
- ✅ Optimism
- ✅ Base

## 🔗 Links

- [Uniswap V3 SDK Docs](https://docs.uniswap.org/sdk/v3/overview)
- [Wagmi Docs](https://wagmi.sh/)
- [RainbowKit Docs](https://www.rainbowkit.com/)

## 🧪 Testing

1. **Connect wallet** (MetaMask/WalletConnect)
2. **Open CreatePositionModal** для любого пула
3. **Введите amounts** для token0 и token1
4. **Выберите range** (Full или Custom)
5. **Click "Create Position"**
6. **Sign transaction** в вашем кошельке
7. **Wait for confirmation**
8. **See success** с ссылкой на Explorer

## 🐛 Troubleshooting

### "Wallet not connected"
- Убедитесь что RainbowKit правильно настроен в `app/providers.tsx`
- Проверьте `.env.local`: `NEXT_PUBLIC_WALLETCONNECT_ID=your_project_id`

### "Failed to prepare position"
- Проверьте что pool address корректный
- Убедитесь что token addresses правильные
- Проверьте network (mainnet/arbitrum/polygon/etc)

### "Transaction failed"
- Проверьте баланс токенов в кошельке
- Убедитесь что approve был выполнен (см. TODO выше)
- Проверьте gas price и лимиты

### "could not detect network"
- Убедитесь что RPC endpoints доступны
- Проверьте chainId в config
- Попробуйте использовать другой RPC provider

---

**Готово!** Теперь вы можете создавать позиции в Uniswap V3 прямо из вашего приложения! 🎉

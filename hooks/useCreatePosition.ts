// hooks/useCreatePosition.ts
import { useState } from 'react';
import { useSendTransaction, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { parseEther } from 'viem';

export interface CreatePositionParams {
  poolAddress: string;
  token0Address: string;
  token1Address: string;
  token0Decimals: number;
  token1Decimals: number;
  feeTier: number;
  amount0Desired: string; // В raw amount (с учетом decimals)
  amount1Desired: string; // В raw amount
  minPrice?: number;
  maxPrice?: number;
  isFullRange: boolean;
  network: string;
  slippageTolerance?: number; // В процентах, по умолчанию 0.5%
}

export interface PositionCreationStatus {
  preparing: boolean;
  approving: boolean;
  minting: boolean;
  completed: boolean;
  error: string | null;
}

export function useCreatePosition() {
  const { address: userAddress } = useAccount();
  const [status, setStatus] = useState<PositionCreationStatus>({
    preparing: false,
    approving: false,
    minting: false,
    completed: false,
    error: null,
  });
  const [positionData, setPositionData] = useState<any>(null);

  const { sendTransaction, data: txHash, isPending: isTxPending } = useSendTransaction();
  const { isLoading: isTxConfirming, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  /**
   * Создать позицию в Uniswap V3
   */
  const createPosition = async (params: CreatePositionParams) => {
    if (!userAddress) {
      setStatus(prev => ({ ...prev, error: 'Wallet not connected' }));
      return null;
    }

    try {
      // Сбрасываем статус
      setStatus({
        preparing: true,
        approving: false,
        minting: false,
        completed: false,
        error: null,
      });

      console.log('🔧 Preparing position creation...', params);

      // 1. Вызываем API endpoint для подготовки calldata
      const prepareResponse = await fetch('/api/positions/prepare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...params,
          userAddress,
        }),
      });

      if (!prepareResponse.ok) {
        const errorData = await prepareResponse.json();
        throw new Error(errorData.error || 'Failed to prepare position');
      }

      const { data } = await prepareResponse.json();
      console.log('✅ Position prepared:', data);

      setPositionData(data);

      // 2. Апрувим токены (если нужно)
      // ВАЖНО: Для упрощения пропускаем этап approve в этом примере
      // В production нужно проверить allowance и сделать approve если нужно
      setStatus(prev => ({ ...prev, preparing: false, approving: true }));

      // TODO: Implement token approval logic
      // const token0Contract = new Contract(...)
      // await token0Contract.approve(NONFUNGIBLE_POSITION_MANAGER, amount0)
      // await token1Contract.approve(NONFUNGIBLE_POSITION_MANAGER, amount1)

      // 3. Отправляем транзакцию на создание позиции
      setStatus(prev => ({ ...prev, approving: false, minting: true }));

      console.log('🚀 Sending mint transaction...');

      await sendTransaction({
        to: data.to as `0x${string}`,
        data: data.calldata as `0x${string}`,
        value: BigInt(data.value || '0'),
      });

      // 4. Ждем подтверждения транзакции
      // (useWaitForTransactionReceipt автоматически отслеживает txHash)

      return data;

    } catch (error) {
      console.error('❌ Error creating position:', error);
      setStatus(prev => ({
        ...prev,
        preparing: false,
        approving: false,
        minting: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
      return null;
    }
  };

  // Обновляем статус когда транзакция подтверждается
  if (isTxSuccess && status.minting) {
    setStatus(prev => ({
      ...prev,
      minting: false,
      completed: true,
    }));
  }

  return {
    createPosition,
    status: {
      ...status,
      minting: isTxPending || isTxConfirming,
    },
    positionData,
    txHash,
    isSuccess: isTxSuccess,
    reset: () => {
      setStatus({
        preparing: false,
        approving: false,
        minting: false,
        completed: false,
        error: null,
      });
      setPositionData(null);
    },
  };
}

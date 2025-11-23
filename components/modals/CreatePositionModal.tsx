// components/modals/CreatePositionModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAccount } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { useCreatePosition } from '@/hooks/useCreatePosition';
import { Loader2, Check, ExternalLink, AlertCircle } from 'lucide-react';
import { ethers } from 'ethers';

interface Pool {
  id: string;
  address: string;
  network: string;
  token0Symbol: string;
  token1Symbol: string;
  token0Address: string;
  token1Address: string;
  token0Decimals: number;
  token1Decimals: number;
  fee: number;
  tvlUSD: number;
  apr?: number;
}

interface CreatePositionModalProps {
  pool: Pool | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function CreatePositionModal({ pool, isOpen, onClose }: CreatePositionModalProps) {
  const { address: walletAddress } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { createPosition, status, positionData, txHash, isSuccess, reset } = useCreatePosition();

  const [amount0, setAmount0] = useState('');
  const [amount1, setAmount1] = useState('');
  const [rangeType, setRangeType] = useState<'full' | 'custom'>('full');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [slippage, setSlippage] = useState('0.5');

  useEffect(() => {
    if (!isOpen) {
      setAmount0('');
      setAmount1('');
      setRangeType('full');
      setMinPrice('');
      setMaxPrice('');
      reset();
    }
  }, [isOpen, reset]);

  if (!pool) return null;

  const handleCreate = async () => {
    if (!walletAddress) {
      openConnectModal?.();
      return;
    }

    try {
      const amount0Raw = ethers.utils.parseUnits(amount0 || '0', pool.token0Decimals).toString();
      const amount1Raw = ethers.utils.parseUnits(amount1 || '0', pool.token1Decimals).toString();

      await createPosition({
        poolAddress: pool.address,
        token0Address: pool.token0Address,
        token1Address: pool.token1Address,
        token0Decimals: pool.token0Decimals,
        token1Decimals: pool.token1Decimals,
        feeTier: pool.fee,
        amount0Desired: amount0Raw,
        amount1Desired: amount1Raw,
        minPrice: rangeType === 'custom' ? parseFloat(minPrice) : undefined,
        maxPrice: rangeType === 'custom' ? parseFloat(maxPrice) : undefined,
        isFullRange: rangeType === 'full',
        network: pool.network,
        slippageTolerance: parseFloat(slippage),
      });
    } catch (error) {
      console.error('Failed to create position:', error);
    }
  };

  const getExplorerUrl = (network: string, txHash: string) => {
    const explorers: Record<string, string> = {
      mainnet: 'https://etherscan.io',
      arbitrum: 'https://arbiscan.io',
      polygon: 'https://polygonscan.com',
      optimism: 'https://optimistic.etherscan.io',
      base: 'https://basescan.org',
    };
    return \`\${explorers[network] || explorers.mainnet}/tx/\${txHash}\`;
  };

  const isFormValid = () => {
    if (!amount0 || !amount1) return false;
    if (parseFloat(amount0) <= 0 || parseFloat(amount1) <= 0) return false;
    if (rangeType === 'custom') {
      if (!minPrice || !maxPrice) return false;
      if (parseFloat(minPrice) >= parseFloat(maxPrice)) return false;
    }
    return true;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Liquidity Position</DialogTitle>
          <DialogDescription>
            Add liquidity to {pool.token0Symbol}/{pool.token1Symbol} pool on {pool.network}
          </DialogDescription>
        </DialogHeader>

        {isSuccess && txHash ? (
          <div className="space-y-6 py-6">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="rounded-full bg-green-100 p-3">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-foreground">
                  Position Created Successfully!
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Your liquidity position has been created
                </p>
              </div>

              <Button
                onClick={() => window.open(getExplorerUrl(pool.network, txHash), '_blank')}
                variant="outline"
                className="w-full"
              >
                View on Explorer
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>

              <Button onClick={onClose} className="w-full">
                Close
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {status.error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start space-x-2">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-800">Error</p>
                  <p className="text-sm text-red-600">{status.error}</p>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  {pool.token0Symbol} Amount
                </label>
                <Input
                  type="number"
                  placeholder="0.0"
                  value={amount0}
                  onChange={(e) => setAmount0(e.target.value)}
                  disabled={status.preparing || status.minting}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  {pool.token1Symbol} Amount
                </label>
                <Input
                  type="number"
                  placeholder="0.0"
                  value={amount1}
                  onChange={(e) => setAmount1(e.target.value)}
                  disabled={status.preparing || status.minting}
                />
              </div>
            </div>

            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={onClose}
                className="flex-1"
                disabled={status.preparing || status.minting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                className="flex-1"
                disabled={!isFormValid() || status.preparing || status.minting || !walletAddress}
              >
                {status.preparing && <>Preparing...</>}
                {status.minting && <>Confirming...</>}
                {!status.preparing && !status.minting && (walletAddress ? 'Create Position' : 'Connect Wallet')}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

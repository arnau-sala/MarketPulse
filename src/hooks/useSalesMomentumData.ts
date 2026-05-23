import { useEffect, useState } from 'react';
import type { BackendDataSource } from '../types/backend';
import type { SalesMomentumData } from '../types';
import { loadSalesMomentumData } from '../data/gateway/marketPulseGateway';
import { salesMomentumData as mockSalesMomentumData } from '../data/mockData';

export function useSalesMomentumData() {
  const [data, setData] = useState<SalesMomentumData>(mockSalesMomentumData);
  const [source, setSource] = useState<BackendDataSource>('mock');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    loadSalesMomentumData()
      .then((result) => {
        if (cancelled) {
          return;
        }

        setData(result.data);
        setSource(result.source);
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { data, source, isLoading };
}

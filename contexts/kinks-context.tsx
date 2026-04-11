import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { fetchAllKinks, type Kink } from '@/lib/kinks';

type KinksContextValue = {
  kinks: Kink[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const KinksContext = createContext<KinksContextValue | null>(null);

export function KinksProvider({ children }: { children: ReactNode }) {
  const [kinks, setKinks] = useState<Kink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const rows = await fetchAllKinks();
    setKinks(rows);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ kinks, loading, error, refresh }),
    [kinks, loading, error, refresh],
  );

  return <KinksContext.Provider value={value}>{children}</KinksContext.Provider>;
}

export function useKinks(): KinksContextValue {
  const ctx = useContext(KinksContext);
  if (!ctx) {
    throw new Error('useKinks must be used within KinksProvider');
  }
  return ctx;
}

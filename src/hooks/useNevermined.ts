import { useState, useEffect, useCallback } from 'react';

interface AuthStatus {
  isLoggedIn: boolean;
  accountAddress?: string;
  balance?: string;
}

interface PaymentTransaction {
  agreementId: string;
  did: string;
  amount: string;
  tokenAddress: string;
  consumer: string;
  provider: string;
  timestamp: string;
  status: 'pending' | 'completed' | 'failed';
}

interface Earnings {
  total: string;
  monthly: string;
  transactions: PaymentTransaction[];
}

export function useNevermined() {
  const [authStatus, setAuthStatus] = useState<AuthStatus>({ isLoggedIn: false });
  const [earnings, setEarnings] = useState<Earnings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkAuthStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/nevermined/auth');
      const data = await response.json();
      
      if (data.success) {
        setAuthStatus(data);
        return data;
      } else {
        throw new Error(data.error);
      }
    } catch {
      setError('Authentication verification failed');
      return null;
    }
  }, []);

  const login = useCallback(async (privateKey?: string, seed?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/nevermined/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: privateKey || seed ? 'login' : 'create',
          privateKey,
          seed
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        await checkAuthStatus();
        return true;
      } else {
        setError(data.error);
        return false;
      }
    } catch {
      setError('Authentication failed');
      return false;
    } finally {
      setLoading(false);
    }
  }, [checkAuthStatus]);

  const logout = useCallback(async () => {
    try {
      const response = await fetch('/api/nevermined/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' })
      });
      
      if (response.ok) {
        setAuthStatus({ isLoggedIn: false });
        setEarnings(null);
        return true;
      }
      return false;
    } catch {
      setError('Logout failed');
      return false;
    }
  }, []);

  const loadEarnings = useCallback(async () => {
    if (!authStatus.isLoggedIn) return;
    
    try {
      const response = await fetch('/api/nevermined/payments?action=earnings');
      const data = await response.json();
      
      if (data.success) {
        setEarnings(data.data);
        return data.data;
      } else {
        throw new Error(data.error);
      }
    } catch {
      setError('Failed to load earnings data');
      return null;
    }
  }, [authStatus.isLoggedIn]);

  const publishAsset = useCallback(async (assetData: Record<string, unknown>) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/nevermined/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assetData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        return data.data;
      } else {
        throw new Error(data.error);
      }
    } catch {
      setError('Asset publication failed');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const searchAssets = useCallback(async (query: string, filters?: Record<string, unknown>) => {
    try {
      const params = new URLSearchParams({
        action: 'search',
        query,
        ...filters
      });
      
      const response = await fetch(`/api/nevermined/assets?${params}`);
      const data = await response.json();
      
      if (data.success) {
        return data.data;
      } else {
        throw new Error(data.error);
      }
    } catch {
      setError('Asset search failed');
      return null;
    }
  }, []);

  const purchaseAsset = useCallback(async (did: string, serviceIndex = 0) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/nevermined/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'purchase',
          did,
          serviceIndex
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        return data.data.agreementId;
      } else {
        throw new Error(data.error);
      }
    } catch {
      setError('Asset purchase failed');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuthStatus().finally(() => setLoading(false));
  }, [checkAuthStatus]);

  useEffect(() => {
    if (authStatus.isLoggedIn) {
      loadEarnings();
    }
  }, [authStatus.isLoggedIn, loadEarnings]);

  return {
    authStatus,
    earnings,
    loading,
    error,
    login,
    logout,
    loadEarnings,
    publishAsset,
    searchAssets,
    purchaseAsset,
    checkAuthStatus
  };
}
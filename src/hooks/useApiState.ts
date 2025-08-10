'use client';

import { useState, useCallback } from 'react';

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  lastFetch: Date | null;
}

interface UseApiStateOptions {
  initialData?: any;
  onError?: (error: Error) => void;
  onSuccess?: (data: any) => void;
}

interface UseApiStateReturn<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  lastFetch: Date | null;
  setData: (data: T | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  reset: () => void;
  execute: <R = T>(apiCall: () => Promise<R>) => Promise<R | null>;
  retry: (() => Promise<any>) | null;
}

export function useApiState<T = any>(options: UseApiStateOptions = {}): UseApiStateReturn<T> {
  const { initialData = null, onError, onSuccess } = options;
  
  const [state, setState] = useState<ApiState<T>>({
    data: initialData,
    loading: false,
    error: null,
    lastFetch: null
  });
  
  const [lastApiCall, setLastApiCall] = useState<(() => Promise<any>) | null>(null);

  const setData = useCallback((data: T | null) => {
    setState(prev => ({ ...prev, data }));
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, loading }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error }));
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const reset = useCallback(() => {
    setState({
      data: initialData,
      loading: false,
      error: null,
      lastFetch: null
    });
    setLastApiCall(null);
  }, [initialData]);

  const execute = useCallback(async <R = T>(apiCall: () => Promise<R>): Promise<R | null> => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      setLastApiCall(() => apiCall);
      
      const result = await apiCall();
      
      setState(prev => ({
        ...prev,
        data: result as unknown as T,
        loading: false,
        error: null,
        lastFetch: new Date()
      }));
      
      if (onSuccess) {
        onSuccess(result);
      }
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
        lastFetch: new Date()
      }));
      
      if (onError && error instanceof Error) {
        onError(error);
      }
      
      console.error('API call failed:', error);
      return null;
    }
  }, [onError, onSuccess]);

  const retry = useCallback(async () => {
    if (lastApiCall) {
      return execute(lastApiCall);
    }
    return null;
  }, [lastApiCall, execute]);

  return {
    data: state.data,
    loading: state.loading,
    error: state.error,
    lastFetch: state.lastFetch,
    setData,
    setLoading,
    setError,
    clearError,
    reset,
    execute,
    retry: lastApiCall ? retry : null
  };
}
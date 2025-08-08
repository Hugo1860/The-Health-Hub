import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface CSRFTokenHook {
  token: string | null;
  loading: boolean;
  error: string | null;
  refreshToken: () => Promise<void>;
}

export const useCSRFToken = (): CSRFTokenHook => {
  const { data: session, status } = useSession();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchToken = async () => {
    if (status !== 'authenticated' || !session) {
      setToken(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/csrf-token', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('获取CSRF令牌失败');
      }

      const data = await response.json();
      setToken(data.csrfToken);
    } catch (err) {
      console.error('CSRF token fetch error:', err);
      setError(err instanceof Error ? err.message : '获取CSRF令牌失败');
      setToken(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshToken = async () => {
    await fetchToken();
  };

  useEffect(() => {
    if (status === 'authenticated') {
      fetchToken();
    } else if (status === 'unauthenticated') {
      setToken(null);
      setError(null);
    }
  }, [status, session]);

  return {
    token,
    loading,
    error,
    refreshToken,
  };
};

// 创建带有CSRF保护的fetch函数
export const createSecureFetch = (csrfToken: string | null) => {
  return async (url: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers);
    
    // 添加CSRF令牌到请求头
    if (csrfToken && ['POST', 'PUT', 'DELETE'].includes(options.method?.toUpperCase() || 'GET')) {
      headers.set('X-CSRF-Token', csrfToken);
    }
    
    // 确保Content-Type正确设置
    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    return fetch(url, {
      ...options,
      headers,
    });
  };
};

// 用于表单提交的安全fetch hook
export const useSecureFetch = () => {
  const { token, loading, error, refreshToken } = useCSRFToken();
  
  const secureFetch = createSecureFetch(token);
  
  return {
    secureFetch,
    csrfToken: token,
    csrfLoading: loading,
    csrfError: error,
    refreshCSRFToken: refreshToken,
  };
};
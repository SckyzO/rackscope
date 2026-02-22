import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

const TOKEN_KEY = 'rackscope.auth.token';

export type AuthUser = { username: string };

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  authEnabled: boolean;
  authConfigured: boolean;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshStatus: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  token: null,
  authEnabled: false,
  authConfigured: false,
  loading: true,
  login: async () => {},
  logout: () => {},
  refreshStatus: async () => {},
});

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();
  const [token, setToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  });
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authEnabled, setAuthEnabled] = useState(false);
  const [authConfigured, setAuthConfigured] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/status');
      if (res.ok) {
        const s = (await res.json()) as {
          enabled: boolean;
          configured: boolean;
          username: string;
        };
        setAuthEnabled(s.enabled);
        setAuthConfigured(s.configured);
        return s.enabled;
      }
    } catch {
      /* network error — keep current state */
    }
    return false;
  }, []);

  useEffect(() => {
    const init = async () => {
      const enabled = await fetchStatus();
      const storedToken = (() => {
        try {
          return localStorage.getItem(TOKEN_KEY);
        } catch {
          return null;
        }
      })();
      if (enabled && storedToken) {
        try {
          const res = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${storedToken}` },
          });
          if (res.ok) {
            const me = (await res.json()) as { username: string };
            setUser({ username: me.username });
          } else {
            localStorage.removeItem(TOKEN_KEY);
            setToken(null);
          }
        } catch {
          /* keep token, might be temporary network issue */
        }
      }
      setLoading(false);
    };
    void init();
  }, [fetchStatus]);

  const login = async (username: string, password: string): Promise<void> => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error((body as { detail?: string }).detail ?? 'Login failed');
    }
    const data = (await res.json()) as { access_token: string; username: string };
    try {
      localStorage.setItem(TOKEN_KEY, data.access_token);
    } catch {
      /* ignore storage errors */
    }
    setToken(data.access_token);
    setUser({ username: data.username });
  };

  const logout = useCallback(() => {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
    setToken(null);
    setUser(null);
    navigate('/cosmos/auth/signin');
  }, [navigate]);

  const refreshStatus = useCallback(async () => {
    await fetchStatus();
  }, [fetchStatus]);

  return (
    <AuthContext.Provider
      value={{ user, token, authEnabled, authConfigured, loading, login, logout, refreshStatus }}
    >
      {children}
    </AuthContext.Provider>
  );
};

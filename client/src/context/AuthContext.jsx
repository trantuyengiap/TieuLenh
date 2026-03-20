import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../api/http';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/auth/me')
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      async login(credentials) {
        const data = await apiFetch('/auth/login', { method: 'POST', body: JSON.stringify(credentials) });
        setUser(data.user);
      },
      async logout() {
        await apiFetch('/auth/logout', { method: 'POST' });
        setUser(null);
      },
      async refresh() {
        const data = await apiFetch('/auth/me');
        setUser(data.user);
      },
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

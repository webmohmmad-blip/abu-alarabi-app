import { createContext, useCallback, useMemo, ReactNode } from 'react';
import { useGetMe, getGetMeQueryKey, User } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const { data: user, isLoading, isError } = useGetMe({
    query: {
      queryKey: getGetMeQueryKey(),
      retry: false,          // never retry 401 — avoids delay on unauthenticated users
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 min — reduce /auth/me chatter
    }
  });

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    queryClient.clear();
    window.location.replace('/login');
  }, [queryClient]);

  const value = useMemo(
    () => ({
      user: isError ? null : (user ?? null),
      isLoading,
      isAuthenticated: !!user && !isError,
      logout,
    }),
    [user, isLoading, isError, logout]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

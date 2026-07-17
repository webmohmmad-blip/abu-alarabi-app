import { createContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { useGetMe, User } from '@workspace/api-client-react';
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
  const { data: user, isLoading: isQueryLoading, isError } = useGetMe({
    query: {
      retry: false,
      refetchOnWindowFocus: false,
    }
  });

  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!isQueryLoading) {
      setIsReady(true);
    }
  }, [isQueryLoading]);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    queryClient.clear();
    window.location.href = '/login';
  }, [queryClient]);

  return (
    <AuthContext.Provider
      value={{
        user: isError ? null : user ?? null,
        isLoading: !isReady || isQueryLoading,
        isAuthenticated: !!user && !isError,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

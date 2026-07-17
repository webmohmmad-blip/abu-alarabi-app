import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useGetMe, User } from '@workspace/api-client-react';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: user, isLoading: isQueryLoading, isError } = useGetMe({
    query: {
      retry: false,
      refetchOnWindowFocus: false,
    }
  });

  // Small local state to avoid flickering before query finishes
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!isQueryLoading) {
      setIsReady(true);
    }
  }, [isQueryLoading]);

  return (
    <AuthContext.Provider
      value={{
        user: isError ? null : user ?? null,
        isLoading: !isReady || isQueryLoading,
        isAuthenticated: !!user && !isError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

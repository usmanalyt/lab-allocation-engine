import { createContext, useContext, useState, type ReactNode, useEffect } from 'react';

interface AuthState {
  token: string | null;
  userId: string | null;
  isAdmin: boolean;
  isInitialized: boolean;
}

interface AuthContextType extends AuthState {
  login: (token: string, userId: string, isAdmin: boolean) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    token: null,
    userId: null,
    isAdmin: false,
    isInitialized: false,
  });

  useEffect(() => {
    // Check localStorage for existing session on mount
    const token = localStorage.getItem('lab_token');
    const userId = localStorage.getItem('lab_user_id');
    const isAdmin = localStorage.getItem('lab_is_admin') === 'true';

    setAuthState({
      token,
      userId,
      isAdmin,
      isInitialized: true,
    });
  }, []);

  const login = (token: string, userId: string, isAdmin: boolean) => {
    localStorage.setItem('lab_token', token);
    localStorage.setItem('lab_user_id', userId);
    localStorage.setItem('lab_is_admin', String(isAdmin));
    
    setAuthState({
      token,
      userId,
      isAdmin,
      isInitialized: true,
    });
  };

  const logout = () => {
    localStorage.removeItem('lab_token');
    localStorage.removeItem('lab_user_id');
    localStorage.removeItem('lab_is_admin');
    
    setAuthState({
      token: null,
      userId: null,
      isAdmin: false,
      isInitialized: true,
    });
  };

  return (
    <AuthContext.Provider value={{ ...authState, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

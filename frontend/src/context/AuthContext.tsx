import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { authService } from '../services/auth.service';
import { usersService } from '../services/users.service';
import { User, LoginDto } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: LoginDto) => Promise<any>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
  isUploadingAvatar: boolean;
  setIsUploadingAvatar: (loading: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const checkAuth = async () => {
    if (!authService.getToken()) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const currentUser = await usersService.getCurrentUser();
      setUser(currentUser);
    } catch {
      // User is not authenticated or token invalid
      authService.logout(); // Ensure token is cleared if invalid
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (credentials: LoginDto) => {
    const response = await authService.login(credentials);
    setUser(response.user);
    return response;
  };

  const logout = async () => {
    authService.logout();
    setUser(null);
  };

  const refreshUser = async () => {
    await checkAuth();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        setUser,
        refreshUser,
        isAuthenticated: !!user,
        isUploadingAvatar,
        setIsUploadingAvatar,
      }}
    >
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

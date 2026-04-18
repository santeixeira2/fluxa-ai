import { createContext, useContext, useCallback, type ReactNode } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { authLogin, authRegister, authLogout, authGoogle, type AuthTokens } from '../api/client';
import { setTokens, clearAuth, type RootState } from '../store';

interface AuthContextValue {
  user: { email: string; name?: string } | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, phone: string) => Promise<void>;
  loginWithGoogle: (accessToken: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function saveToStore(dispatch: ReturnType<typeof useDispatch>, tokens: AuthTokens) {
  dispatch(setTokens(tokens));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);

  const login = useCallback(async (email: string, password: string) => {
    const tokens = await authLogin(email, password);
    saveToStore(dispatch, tokens);
  }, [dispatch]);

  const register = useCallback(async (email: string, password: string, name: string, phone: string) => {
    const tokens = await authRegister(email, password, name, phone);
    saveToStore(dispatch, tokens);
  }, [dispatch]);

  const loginWithGoogle = useCallback(async (accessToken: string) => {
    const tokens = await authGoogle(accessToken);
    saveToStore(dispatch, tokens);
  }, [dispatch]);

  const logout = useCallback(async () => {
    await authLogout().catch(() => {});
    dispatch(clearAuth());
  }, [dispatch]);

  return (
    <AuthContext.Provider value={{ user, login, register, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

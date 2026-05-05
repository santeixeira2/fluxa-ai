import { createContext, useContext, useCallback, type ReactNode } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { authLogin, authRegister, authLogout, authGoogle, authTotpVerify, type AuthTokens } from '../api/client';
import { setTokens, clearAuth, type RootState } from '../store';

export interface MfaRequired {
  mfaToken: string;
}

interface AuthContextValue {
  user: { email: string; name?: string } | null;
  login: (email: string, password: string) => Promise<MfaRequired | null>;
  register: (email: string, password: string, name: string, phone: string) => Promise<void>;
  loginWithGoogle: (accessToken: string) => Promise<void>;
  verifyTotp: (mfaToken: string, code: string, rememberDevice: boolean) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function saveToStore(dispatch: ReturnType<typeof useDispatch>, tokens: AuthTokens) {
  dispatch(setTokens(tokens));
  if (tokens.deviceToken) {
    localStorage.setItem('deviceToken', tokens.deviceToken);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);

  const login = useCallback(async (email: string, password: string): Promise<MfaRequired | null> => {
    const deviceToken = localStorage.getItem('deviceToken') ?? undefined;
    const result = await authLogin(email, password, deviceToken);
    if ('mfaPending' in result) {
      return { mfaToken: result.mfaToken };
    }
    saveToStore(dispatch, result);
    return null;
  }, [dispatch]);

  const register = useCallback(async (email: string, password: string, name: string, phone: string) => {
    const tokens = await authRegister(email, password, name, phone);
    saveToStore(dispatch, tokens);
  }, [dispatch]);

  const loginWithGoogle = useCallback(async (accessToken: string) => {
    const tokens = await authGoogle(accessToken);
    saveToStore(dispatch, tokens);
  }, [dispatch]);

  const verifyTotp = useCallback(async (mfaToken: string, code: string, rememberDevice: boolean) => {
    const tokens = await authTotpVerify(mfaToken, code, rememberDevice);
    saveToStore(dispatch, tokens);
  }, [dispatch]);

  const logout = useCallback(async () => {
    await authLogout().catch(() => {});
    localStorage.removeItem('deviceToken');
    dispatch(clearAuth());
  }, [dispatch]);

  return (
    <AuthContext.Provider value={{ user, login, register, loginWithGoogle, verifyTotp, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

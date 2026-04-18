import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface AuthUser {
  email: string;
  name?: string;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
}

function parseToken(token: string): AuthUser | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return { email: payload.email, name: payload.name };
  } catch {
    return null;
  }
}

const storedAccess = localStorage.getItem('accessToken');

const initialState: AuthState = {
  user: storedAccess ? parseToken(storedAccess) : null,
  accessToken: storedAccess,
  refreshToken: localStorage.getItem('refreshToken'),
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setTokens(state, action: PayloadAction<{ accessToken: string; refreshToken: string }>) {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      state.user = parseToken(action.payload.accessToken);
    },
    clearAuth(state) {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
    },
  },
});

export const { setTokens, clearAuth } = authSlice.actions;
export default authSlice.reducer;

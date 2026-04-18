import { configureStore } from '@reduxjs/toolkit';
import authReducer, { setTokens, clearAuth } from './authSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
  },
});

store.subscribe(() => {
  const { accessToken, refreshToken } = store.getState().auth;
  if (accessToken && refreshToken) {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  } else {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }
});

export { setTokens, clearAuth };
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

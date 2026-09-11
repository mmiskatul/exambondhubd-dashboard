import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthState {
  user: AdminUser | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isInitialized: false,
};

/**
 * The session token itself never lives here (or anywhere else client JS can
 * read) — it's an HttpOnly cookie the browser attaches on its own. This
 * slice only tracks who the cookie belongs to, learned once at boot from
 * `/api/auth/me` and refreshed on login/logout.
 */
export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    /** Dispatched once at startup with whatever `/api/auth/me` answered. */
    authRestored: (state, action: PayloadAction<AdminUser | null>) => {
      state.user = action.payload;
      state.isAuthenticated = Boolean(action.payload);
      state.isInitialized = true;
    },

    setCredentials: (state, action: PayloadAction<{ user: AdminUser }>) => {
      state.user = action.payload.user;
      state.isAuthenticated = true;
      state.isInitialized = true;
    },

    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
    },
  },
});

export const { authRestored, setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;

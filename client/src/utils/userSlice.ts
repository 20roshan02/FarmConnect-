import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

export interface User {
  _id: string;
  name: string;
  email: string;
  role: "customer" | "farmer" | "admin";
  token?: string;
}

interface UserState {
  user: User | null;
  isAuthenticated: boolean;
}

// ✅ Rehydrate from localStorage on app startup so a hard refresh
// (or a fresh visit to a deployed URL) doesn't lose the logged-in state.
function loadUserFromStorage(): User | null {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    return JSON.parse(raw) as User;
  } catch {
    // Corrupted/old data shouldn't crash the app — just start logged out.
    return null;
  }
}

const storedUser = loadUserFromStorage();

const initialState: UserState = {
  user: storedUser,
  isAuthenticated: !!storedUser,
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    login: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.isAuthenticated = true;

      // ✅ keep localStorage in sync here too, so every place that logs
      // the user in (not just Login.tsx) persists correctly.
      localStorage.setItem("user", JSON.stringify(action.payload));
      if (action.payload.token) {
        localStorage.setItem("token", action.payload.token);
      }
    },

    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;

      // ✅ clear persisted auth so a refresh after logout stays logged out
      localStorage.removeItem("user");
      localStorage.removeItem("token");
    },
    updateUser: (state, action) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
        localStorage.setItem("user", JSON.stringify(state.user));
      }
    },
  },
});

export const { login, logout, updateUser } = userSlice.actions;
export default userSlice.reducer;
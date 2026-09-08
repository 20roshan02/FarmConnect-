import { configureStore } from "@reduxjs/toolkit";
import userReducer from "./userSlice";
import cartReducer from "./cartSlice";
import searchReducer from "./searchSlice";
import type { User } from "./userSlice";


const storedUser = localStorage.getItem("user");
let parsedUser: User | null = null;

try {
  parsedUser = storedUser ? JSON.parse(storedUser) : null;
} catch (error) {
  console.log("Failed to parse stored user", error);
  parsedUser = null;
}

const preloadedState = {
  user: {
    user: parsedUser,
    isAuthenticated: !!parsedUser,
  },
};

export const store = configureStore({
  reducer: {
    user: userReducer,
    cart: cartReducer,
    search: searchReducer,
  },
  preloadedState,
});


export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
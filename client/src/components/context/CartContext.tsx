import { createContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import axios from "axios";
import { useSelector } from "react-redux";
import type { CartType } from "../../page/cart";
import type { RootState } from "../../utils/store";

interface CartContextType {
  cart: CartType | null;
  fetchCart: () => Promise<void>;
  addToCart: (productId: string, quantity?: number) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  clearCart: () => Promise<void>;
}

export const CartContext = createContext<CartContextType | null>(null);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cart, setCart] = useState<CartType | null>(null);

  // ✅ reactive — re-renders whenever login/logout happens
  const user = useSelector((state: RootState) => state.user.user);

  const getConfig = () => ({
    headers: {
      Authorization: `Bearer ${user?.token}`,
    },
  });

  const fetchCart = async () => {
    if (!user?.token) {
      setCart(null); // ✅ clear cart on logout instead of leaving stale data
      return;
    }

    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/cart`,
        getConfig()
      );

      const serverCart = res.data?.cart;
      setCart({
        items: Array.isArray(serverCart?.items) ? serverCart.items : [],
        totalPrice:
          typeof serverCart?.totalPrice === "number"
            ? serverCart.totalPrice
            : 0,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const addToCart = async (productId: string, quantity = 1) => {
    if (!user?.token) return;
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/cart/addtoCart`,
        { productId, quantity },
        getConfig()
      );
      await fetchCart();
    } catch (error) {
      console.error(error);
    }
  };

  const removeItem = async (productId: string) => {
    if (!user?.token) return;
    try {
      await axios.delete(
        `${import.meta.env.VITE_API_URL}/cart/remove/${productId}`,
        getConfig()
      );
      await fetchCart();
    } catch (error) {
      console.error(error);
    }
  };

  const clearCart = async () => {
    if (!user?.token) return;
    try {
      await axios.delete(
        `${import.meta.env.VITE_API_URL}/cart/clear`,
        getConfig()
      );
      await fetchCart();
    } catch (error) {
      console.error(error);
    }
  };

  // ✅ re-fetches automatically on login AND clears on logout
  useEffect(() => {
    fetchCart();
  }, [user]);

  return (
    <CartContext.Provider
      value={{
        cart,
        fetchCart,
        addToCart,
        removeItem,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
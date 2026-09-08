import { useContext, useState } from "react";
import { useNavigate } from "react-router";
import { useSelector } from "react-redux";
import axios from "axios";
import toast from "react-hot-toast";
import { HiOutlineTrash, HiOutlineShoppingBag } from "react-icons/hi";
import { CartContext } from "../components/context/CartContext";
import Sidebar from "../components/CustomerSideBar";
import type { RootState } from "../utils/store";
import CheckoutModal from "../components/CheckoutModal";

/** Types */
type Product = {
  _id: string;
  title: string;
};

type CartItem = {
  _id: string;
  product?: Product | null;
  quantity?: number;
  price?: number;
};

export type CartType = {
  items: CartItem[];
  totalPrice: number;
};

const Cart = () => {
  const navigate = useNavigate();
  const cartContext = useContext(CartContext);
  const user = useSelector((state: RootState) => state.user.user);

  const [checkingOut, setCheckingOut] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);

  if (!cartContext) return null;

  const { cart, removeItem, clearCart } = cartContext;
  const safeCartItems = Array.isArray(cart?.items) ? cart.items : [];
  const totalPrice = typeof cart?.totalPrice === "number" ? cart.totalPrice : 0;

  // ================= CHECKOUT — open delivery modal =================
  const handleCheckout = () => {
    if (!user || !user.token) { toast.error("Please login first"); return; }
    setShowCheckout(true);
  };

  // ================= LOADING STATE =================
  if (!cart) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 min-h-[60vh] flex items-center justify-center">
          <p className="text-gray-500">Loading your cart...</p>
        </div>
      </div>
    );
  }

  // ================= EMPTY STATE =================
  if (safeCartItems.length === 0) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
          <HiOutlineShoppingBag className="text-6xl text-gray-300 mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">
            Your cart is empty
          </h2>
          <p className="text-gray-500 mb-6">
            Looks like you haven't added anything yet.
          </p>
          <button
            onClick={() => navigate("/")}
            className="bg-orange-500 text-white px-6 py-2 rounded-full hover:bg-orange-600 transition-colors"
          >
            Start shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex max-h-163">
      <Sidebar />

      <div className="flex-1 overflow-hidden mx-auto px-4 sm:px-6 py-8 overflow-y-auto">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6">Your Cart</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ================= ITEMS LIST ================= */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            {safeCartItems.map((item) => {
              const productTitle = item.product?.title ?? "Product unavailable";
              const productId = item.product?._id;
              const quantity = item.quantity ?? 1;
              const unitPrice = item.price ?? 0;
              const lineTotal = unitPrice * quantity;

              return (
                <div
                  key={item._id}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center justify-between gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-800 truncate">
                      {productTitle}
                    </h4>
                    <p className="text-sm text-gray-500 mt-1">
                      Qty: {quantity}
                    </p>
                    <p className="text-sm text-gray-500">
                      Rs {unitPrice} <span className="text-gray-400">/ item</span>
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className="font-semibold text-gray-800">Rs {lineTotal}</span>

                    <button
                      onClick={() => {
                        if (productId) {
                          void removeItem(productId);
                        }
                      }}
                      disabled={!productId}
                      className="flex items-center gap-1 text-sm text-red-500 hover:text-red-600 transition-colors cursor-pointer hover:underline disabled:text-gray-400 disabled:no-underline disabled:cursor-not-allowed"
                    >
                      <HiOutlineTrash className="text-base" />
                      {productId ? "Remove" : "Unavailable"}
                    </button>
                  </div>
                </div>
              );
            })}

            <button
              onClick={clearCart}
              className="w-fit text-sm text-gray-500 hover:bg-red-500 hover:text-white underline underline-offset-2 mt-2 transition-colors border p-2 rounded-lg cursor-pointer"
            >
              Clear cart
            </button>
          </div>

          {/* ================= ORDER SUMMARY ================= */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 sticky top-24">
              <h2 className="text-lg font-semibold mb-4">Order Summary</h2>

              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Items ({safeCartItems.reduce((acc, i) => acc + (i.quantity ?? 1), 0)})</span>
                <span>Rs {totalPrice}</span>
              </div>

              <div className="border-t border-gray-100 my-3" />

              <div className="flex justify-between text-base font-semibold mb-6">
                <span>Total</span>
                <span>Rs {totalPrice}</span>
              </div>

              <button
                onClick={handleCheckout}
                disabled={checkingOut}
                className="w-full bg-orange-500 text-white py-2.5 rounded-full font-medium hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {checkingOut ? "Redirecting to Khalti..." : "Proceed to Payment"}
              </button>            </div>
          </div>
        </div>
      </div>

      {/* ── Checkout modal ─────────────────────────────────────────────────── */}
      {showCheckout && user?.token && (
        <CheckoutModal
          mode="cart"
          cartTotal={totalPrice}
          cartItemCount={safeCartItems.reduce((s, i) => s + (i.quantity ?? 1), 0)}
          token={user.token}
          onClose={() => setShowCheckout(false)}
        />
      )}
    </div>
  );
};

export default Cart;
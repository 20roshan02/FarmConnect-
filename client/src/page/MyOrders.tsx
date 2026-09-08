import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useSelector } from "react-redux";
import axios from "axios";
import toast from "react-hot-toast";
import Sidebar from "../components/CustomerSideBar";
import type { RootState } from "../utils/store";
import RecommendedForYou from "../components/RecommendedForYou";

type OrderItem = {
  product?: { _id: string; title?: string; images?: string; price?: number };
  quantity: number;
  price: number;
};

type DeliveryAddress = {
  fullName: string;
  phone: string;
  street: string;
  city: string;
  district: string;
  zip?: string;
  notes?: string;
};

type Order = {
  _id: string;
  amount: number;
  status: "pending" | "paid" | "failed";
  items: OrderItem[];
  createdAt: string;
  deliveryAddress?: DeliveryAddress | null;
};

const STATUS_STYLES: Record<Order["status"], string> = {
  paid: "bg-green-100 text-green-700",
  pending: "bg-yellow-100 text-yellow-700",
  failed: "bg-red-100 text-red-600",
};

export default function MyOrders() {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.user.user);

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.token) {
      toast.error("Please login first");
      navigate("/login");
      return;
    }

    axios
      .get(`${import.meta.env.VITE_API_URL}/order/my-orders`, {
        headers: { Authorization: `Bearer ${user.token}` },
      })
      .then((res) => setOrders(res.data.orders ?? []))
      .catch(() => toast.error("Failed to load orders"))
      .finally(() => setLoading(false));
  }, [user, navigate]);

  const toggleExpand = (id: string) =>
    setExpandedId((prev) => (prev === id ? null : id));

  return (
    <div className="flex max-h-163">
      <Sidebar />

      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6">My Orders</h1>

        {/* ── LOADING ── */}
        {loading && (
          <div className="flex justify-center mt-20">
            <div className="w-10 h-10 rounded-full border-4 border-green-300 border-t-green-600 animate-spin" />
          </div>
        )}

        {/* ── EMPTY ── */}
        {!loading && orders.length === 0 && (
          <div className="flex flex-col items-center justify-center mt-20 text-center gap-4">
            <svg className="w-16 h-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="text-gray-500 text-lg">You haven't placed any orders yet.</p>
            <button
              onClick={() => navigate("/")}
              className="bg-green-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-green-700 transition-colors"
            >
              Start Shopping
            </button>
          </div>
        )}

        {/* ── ORDER LIST ── */}
        {!loading && orders.length > 0 && (
          <div className="flex flex-col gap-4">
            {orders.map((order) => {
              const isOpen = expandedId === order._id;              const date = new Date(order.createdAt).toLocaleDateString("en-NP", {
                year: "numeric",
                month: "short",
                day: "numeric",
              });

              return (
                <div
                  key={order._id}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
                >
                  {/* Header row */}
                  <button
                    onClick={() => toggleExpand(order._id)}
                    className="w-full text-left px-5 py-4 flex flex-wrap items-center gap-3 hover:bg-gray-50 transition-colors"
                    aria-expanded={isOpen}
                  >
                    {/* Date */}
                    <span className="text-sm text-gray-500 min-w-[100px]">{date}</span>

                    {/* Order ID */}
                    <span className="font-mono text-xs text-gray-400 flex-1 truncate">
                      #{order._id.slice(-8).toUpperCase()}
                    </span>

                    {/* Item count */}
                    <span className="text-sm text-gray-600">
                      {order.items.length} item{order.items.length !== 1 ? "s" : ""}
                    </span>

                    {/* Amount */}
                    <span className="font-bold text-green-700 min-w-[80px] text-right">
                      Rs {order.amount}
                    </span>

                    {/* Status badge */}
                    <span
                      className={`text-xs font-semibold px-3 py-1 rounded-full ${STATUS_STYLES[order.status]}`}
                    >
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>

                    {/* Chevron */}
                    <svg
                      className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Expanded detail */}
                  {isOpen && (
                    <div className="px-5 pb-5 border-t border-gray-100">
                      {/* Items */}
                      <div className="divide-y divide-gray-50 mb-4">
                        {order.items.map((item, i) => (
                          <div key={i} className="flex items-center gap-3 py-3">
                            {item.product?.images && (
                              <img
                                src={item.product.images}
                                alt={item.product?.title ?? "Product"}
                                className="w-12 h-12 rounded-xl object-cover shrink-0"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-700 truncate">
                                {item.product?.title ?? "Product unavailable"}
                              </p>
                              <p className="text-xs text-gray-400">
                                Rs {item.price} × {item.quantity}
                              </p>
                            </div>
                            <p className="text-sm font-bold text-gray-700 shrink-0">
                              Rs {item.price * item.quantity}
                            </p>
                          </div>
                        ))}
                      </div>

                      {/* Delivery address */}
                      {order.deliveryAddress && (
                        <div className="mb-4 rounded-xl border border-gray-100 bg-gray-50 p-4">
                          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-gray-400">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Delivery Address
                          </p>
                          <p className="text-sm font-semibold text-gray-800">
                            {order.deliveryAddress.fullName}
                          </p>
                          <p className="text-sm text-gray-600 mt-0.5">
                            {order.deliveryAddress.street}, {order.deliveryAddress.city}
                          </p>
                          <p className="text-sm text-gray-600">
                            {order.deliveryAddress.district}
                            {order.deliveryAddress.zip ? ` — ${order.deliveryAddress.zip}` : ""}
                          </p>
                          <p className="mt-1 flex items-center gap-1 text-sm text-gray-600">
                            <svg className="w-3.5 h-3.5 text-green-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            {order.deliveryAddress.phone}
                          </p>
                          {order.deliveryAddress.notes && (
                            <p className="mt-2 rounded-lg bg-amber-50 border border-amber-100 px-3 py-1.5 text-xs text-amber-700 italic">
                              "{order.deliveryAddress.notes}"
                            </p>
                          )}
                        </div>
                      )}

                      {/* Meta */}
                      <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600 space-y-1">
                        <div className="flex justify-between font-semibold text-gray-800 pt-1 border-t border-gray-200 mt-2">
                          <span>Order Total</span>
                          <span className="text-green-700">Rs {order.amount}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── RECOMMENDED FOR YOU ── */}
        {!loading && (
          <div className="mt-10">
            <RecommendedForYou
              topN={8}
              variant="section"
              title={orders.length > 0 ? "You might also like" : "Popular products to get you started"}
            />
          </div>
        )}
      </div>
    </div>
  );
}

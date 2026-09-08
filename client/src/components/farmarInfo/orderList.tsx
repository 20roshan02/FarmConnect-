/**
 * orderList.tsx — Modern redesign
 * Farmer orders: accordion rows with customer details + delivery address.
 */
import { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { useNavigate } from "react-router";
import { useSelector } from "react-redux";
import { HiOutlineMenu, HiX } from "react-icons/hi";
import { HiOutlineChevronDown, HiOutlineInboxStack } from "react-icons/hi2";
import type { RootState } from "../../utils/store";
import FarmerSidebar from "./FarmerSidebar";

type OrderItem = {
  product?: { _id: string; title?: string; images?: string; price?: number };
  quantity: number; price: number;
};

type DeliveryAddress = {
  fullName: string; phone: string; street: string; city: string; district: string; zip?: string; notes?: string;
};

type Order = {
  _id: string; status: "pending"|"paid"|"failed"; createdAt: string;
  customer?: { name?: string; email?: string };
  items: OrderItem[]; myTotal: number;
  deliveryAddress?: DeliveryAddress | null;
};

const STATUS: Record<string, { bg: string; text: string; dot: string }> = {
  paid:    { bg:"bg-green-50",  text:"text-green-700",  dot:"bg-green-500"  },
  pending: { bg:"bg-amber-50",  text:"text-amber-700",  dot:"bg-amber-500"  },
  failed:  { bg:"bg-red-50",    text:"text-red-600",    dot:"bg-red-500"    },
};

export default function OrderList() {
  const navigate     = useNavigate();
  const user         = useSelector((state: RootState) => state.user.user);
  const [orders,     setOrders]     = useState<Order[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (user && user.role !== "farmer") navigate("/");
  }, [user, navigate]);

  useEffect(() => {
    if (!user?.token) return;
    axios
      .get(`${import.meta.env.VITE_API_URL}/order/farmer-orders`, { headers: { Authorization: `Bearer ${user.token}` } })
      .then(res => setOrders(res.data?.orders ?? []))
      .catch(err => toast.error(err?.response?.data?.message || "Failed to load orders"))
      .finally(() => setLoading(false));
  }, [user]);

  const toggle = (id: string) => setExpandedId(p => p === id ? null : id);

  const paidRevenue = orders.filter(o => o.status === "paid").reduce((s, o) => s + o.myTotal, 0);
  const pendingCount = orders.filter(o => o.status === "pending").length;

  return (
    <div className="flex min-h-screen bg-slate-50">

      {/* Mobile bar */}
      <div className="fixed inset-x-0 top-0 z-30 flex items-center justify-between border-b bg-white/90 px-4 py-3 backdrop-blur-md md:hidden">
        <span className="font-bold text-slate-800">Orders</span>
        <button onClick={() => setMobileOpen(true)} className="rounded-xl border border-slate-200 p-2 text-slate-600">
          <HiOutlineMenu size={20} />
        </button>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="flex h-full w-72 flex-col bg-[#0f1f17] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <span className="font-bold text-white">Menu</span>
              <button onClick={() => setMobileOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:text-white"><HiX size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4"><FarmerSidebar /></div>
          </div>
          <div className="flex-1 bg-black/50" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      <FarmerSidebar />

      <main className="mt-14 flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 md:mt-0">

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Orders</h1>
          <p className="text-sm text-slate-500">Orders containing your products</p>
        </div>

        {/* Quick stats */}
        {!loading && orders.length > 0 && (
          <div className="mb-6 grid grid-cols-3 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Total Orders</p>
              <p className="mt-1.5 text-2xl font-bold text-slate-900">{orders.length}</p>
            </div>
            <div className="rounded-2xl border border-green-100 bg-green-50/50 p-4 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Total Earnings</p>
              <p className="mt-1.5 text-2xl font-bold text-green-700">Rs {paidRevenue.toLocaleString()}</p>
            </div>
            <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Pending</p>
              <p className="mt-1.5 text-2xl font-bold text-amber-600">{pendingCount}</p>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
          </div>
        )}

        {/* Empty */}
        {!loading && orders.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
              <HiOutlineInboxStack size={28} className="text-slate-300" />
            </div>
            <p className="font-semibold text-slate-600">No orders yet</p>
            <p className="text-sm text-slate-400">Orders for your products will appear here.</p>
            <button onClick={() => navigate("/farmerDashboard")}
              className="mt-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700">
              Go to Dashboard
            </button>
          </div>
        )}

        {/* Order list */}
        {!loading && orders.length > 0 && (
          <div className="space-y-3 max-w-4xl">
            {orders.map((order) => {
              const isOpen = expandedId === order._id;
              const st     = STATUS[order.status] ?? STATUS.pending;
              const date   = new Date(order.createdAt).toLocaleDateString("en-NP", { year:"numeric", month:"short", day:"numeric" });

              return (
                <div key={order._id} className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden transition hover:shadow-md">
                  <button onClick={() => toggle(order._id)}
                    className="w-full flex flex-wrap items-center gap-3 px-5 py-4 text-left hover:bg-slate-50 transition-colors">
                    <span className="text-xs text-slate-400 min-w-[90px]">{date}</span>
                    <span className="font-mono text-xs text-slate-400 flex-1 truncate">#{order._id.slice(-8).toUpperCase()}</span>
                    {order.customer?.name && (
                      <span className="text-sm font-medium text-slate-700 truncate max-w-[140px]">{order.customer.name}</span>
                    )}
                    <span className="text-xs text-slate-400">{order.items.length} item{order.items.length !== 1 ? "s" : ""}</span>
                    <span className="font-bold text-emerald-700">Rs {order.myTotal.toLocaleString()}</span>
                    <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${st.bg} ${st.text}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                    <HiOutlineChevronDown size={16} className={`text-slate-400 transition-transform shrink-0 ${isOpen ? "rotate-180" : ""}`} />
                  </button>

                  {isOpen && (
                    <div className="border-t border-slate-100 px-5 pb-5">
                      {/* Items */}
                      <div className="mt-4 space-y-2">
                        {order.items.map((item, i) => (
                          <div key={i} className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
                            {item.product?.images && (
                              <img src={item.product.images} alt={item.product.title} className="h-11 w-11 rounded-xl object-cover shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-900 truncate">{item.product?.title ?? "Product unavailable"}</p>
                              <p className="text-xs text-slate-400">Rs {item.price.toLocaleString()} × {item.quantity}</p>
                            </div>
                            <p className="text-sm font-bold text-slate-800 shrink-0">Rs {(item.price * item.quantity).toLocaleString()}</p>
                          </div>
                        ))}
                      </div>

                      {/* Delivery address */}
                      {order.deliveryAddress && (
                        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">Delivery Address</p>
                          <p className="font-semibold text-slate-900">{order.deliveryAddress.fullName}</p>
                          <p className="text-sm text-slate-600">{order.deliveryAddress.street}, {order.deliveryAddress.city}, {order.deliveryAddress.district}</p>
                          <p className="text-sm text-slate-600">📞 {order.deliveryAddress.phone}</p>
                          {order.deliveryAddress.notes && (
                            <p className="mt-1 text-xs text-amber-700 italic">"{order.deliveryAddress.notes}"</p>
                          )}
                        </div>
                      )}

                      {/* Footer */}
                      <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-3.5">
                        {order.customer?.email && (
                          <div className="text-sm text-slate-500">
                            <span className="font-medium text-slate-800">{order.customer.name}</span>
                            <span className="mx-1 text-slate-300">·</span>
                            <span className="font-mono text-xs">{order.customer.email}</span>
                          </div>
                        )}
                        <div className="ml-auto flex items-center gap-2">
                          <span className="text-sm text-slate-500">Your earnings:</span>
                          <span className="font-bold text-emerald-700">Rs {order.myTotal.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

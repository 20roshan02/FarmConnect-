import { useEffect, useRef, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { useSelector } from "react-redux";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { RootState } from "../../utils/store";

type Summary = { totalRevenue: number; totalOrders: number; paidOrders: number; pendingOrders: number };
type AnalyticsData = {
  summary: Summary;
  topProducts: { product: string; quantitySold: number; revenue: number }[];
  lowStockProducts: { title: string; stock: number }[];
  categorySales: { category: string; quantity: number }[];
  monthlyRevenue: { month: string; revenue: number }[];
  recentOrders: { _id: string; customer: string; product: string; quantity: number; amount: number; paymentStatus: string }[];
};

const CATEGORY_COLORS = ["#16a34a", "#d97706", "#92400e", "#2563eb", "#7c3aed"];
const formatRs = (value: number) => `Rs ${value.toLocaleString()}`;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-900"><span className="h-4 w-1 rounded-full bg-emerald-500" />{title}</h2>{children}</section>;
}
function Empty({ message }: { message: string }) { return <p className="py-8 text-center text-sm text-slate-400">{message}</p>; }
function StatusBadge({ status }: { status: string }) {
  const paid = status === "paid";
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${paid ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>{paid ? "Paid" : "Pending"}</span>;
}

export default function FarmerAnalytics() {
  const user = useSelector((state: RootState) => state.user.user);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!user?.token) return;

    let active = true;
    const loadAnalytics = async (showLoading = false) => {
      if (showLoading) setLoading(true);
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/order/farmer-analytics`, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        if (active) {
          setData(response.data);
          loadedRef.current = true;
        }
      } catch {
        if (active && !loadedRef.current) {
          setData(null);
          toast.error("Failed to load analytics");
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    const handleFocus = () => void loadAnalytics();
    void loadAnalytics(true);
    const refreshTimer = window.setInterval(() => void loadAnalytics(), 30_000);
    window.addEventListener("focus", handleFocus);

    return () => {
      active = false;
      window.clearInterval(refreshTimer);
      window.removeEventListener("focus", handleFocus);
    };
  }, [user?.token]);

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" /></div>;
  if (!data) return <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">Analytics data could not be loaded.</div>;

  const categoryData = data.categorySales.map((item) => ({ ...item, name: item.category.charAt(0).toUpperCase() + item.category.slice(1) }));
  const monthlyData = data.monthlyRevenue.map((item) => ({ ...item, label: new Date(`${item.month}-01T00:00:00`).toLocaleString("default", { month: "short", year: "2-digit" }) }));

  return <div className="space-y-6">
    <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
      {[{ label: "Total Revenue", value: formatRs(data.summary.totalRevenue), color: "border-emerald-400" }, { label: "Total Orders", value: data.summary.totalOrders, color: "border-blue-400" }, { label: "Paid Orders", value: data.summary.paidOrders, color: "border-green-400" }, { label: "Pending Orders", value: data.summary.pendingOrders, color: "border-amber-400" }].map((card) => <div key={card.label} className={`rounded-2xl border border-slate-200 border-t-4 ${card.color} bg-white p-5 shadow-sm`}><p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{card.label}</p><p className="mt-2 text-2xl font-bold text-slate-900">{card.value}</p></div>)}
    </div>

    <Section title="Top Selling Products">{data.topProducts.length === 0 ? <Empty message="No paid product sales yet." /> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b border-slate-100 text-[11px] uppercase tracking-wide text-slate-400"><tr><th className="px-3 py-2">Product Name</th><th className="px-3 py-2">Quantity Sold</th><th className="px-3 py-2">Revenue Generated</th></tr></thead><tbody>{data.topProducts.map((item) => <tr key={item.product} className="border-b border-slate-50 last:border-0"><td className="px-3 py-3 font-semibold text-slate-800">{item.product}</td><td className="px-3 py-3 text-slate-600">{item.quantitySold}</td><td className="px-3 py-3 font-semibold text-emerald-700">{formatRs(item.revenue)}</td></tr>)}</tbody></table></div>}</Section>

    <div className="grid gap-6 xl:grid-cols-2">
      <Section title="Low Stock Alerts">{data.lowStockProducts.length === 0 ? <Empty message="All products have healthy stock." /> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b border-slate-100 text-[11px] uppercase tracking-wide text-slate-400"><tr><th className="px-3 py-2">Product</th><th className="px-3 py-2">Current Stock</th><th className="px-3 py-2">Status</th></tr></thead><tbody>{data.lowStockProducts.map((item) => <tr key={item.title} className="border-b border-slate-50 last:border-0"><td className="px-3 py-3 font-semibold text-slate-800">{item.title}</td><td className="px-3 py-3 text-slate-600">{item.stock}</td><td className="px-3 py-3"><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${item.stock === 0 ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>{item.stock === 0 ? "Out of Stock" : "Low Stock"}</span></td></tr>)}</tbody></table></div>}</Section>
      <Section title="Sales by Category">{categoryData.length === 0 ? <Empty message="No paid category sales yet." /> : <ResponsiveContainer width="100%" height={220}><PieChart><Pie data={categoryData} dataKey="quantity" nameKey="name" innerRadius={55} outerRadius={82} paddingAngle={3}>{categoryData.map((item, index) => <Cell key={item.category} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer>}</Section>
    </div>

    <Section title="Monthly Revenue">{monthlyData.length === 0 ? <Empty message="No paid revenue yet." /> : <ResponsiveContainer width="100%" height={240}><BarChart data={monthlyData} margin={{ top: 8, right: 12, bottom: 4, left: 8 }}><XAxis dataKey="label" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} tickFormatter={(value) => `Rs${Number(value).toLocaleString()}`} /><Tooltip formatter={(value: number) => [formatRs(value), "Revenue"]} /><Bar dataKey="revenue" fill="#10b981" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer>}</Section>

    <Section title="Recent Customer Orders">{data.recentOrders.length === 0 ? <Empty message="No orders received yet." /> : <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="border-b border-slate-100 text-[11px] uppercase tracking-wide text-slate-400"><tr><th className="px-3 py-2">Customer Name</th><th className="px-3 py-2">Product</th><th className="px-3 py-2">Quantity</th><th className="px-3 py-2">Amount</th><th className="px-3 py-2">Payment Status</th></tr></thead><tbody>{data.recentOrders.map((order) => <tr key={order._id} className="border-b border-slate-50 last:border-0"><td className="px-3 py-3 font-semibold text-slate-800">{order.customer}</td><td className="max-w-[220px] truncate px-3 py-3 text-slate-600">{order.product}</td><td className="px-3 py-3 text-slate-600">{order.quantity}</td><td className="px-3 py-3 font-semibold text-emerald-700">{formatRs(order.amount)}</td><td className="px-3 py-3"><StatusBadge status={order.paymentStatus} /></td></tr>)}</tbody></table></div>}</Section>
  </div>;
}

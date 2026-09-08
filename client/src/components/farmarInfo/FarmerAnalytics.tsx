import { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { useSelector } from "react-redux";
import type { RootState } from "../../utils/store";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  AreaChart, Area,
} from "recharts";

// ─── Types ───────────────────────────────────────────────────────────────────
interface AnalyticsData {
  stockData: { name: string; stock: number; price: number }[];
  productsByCategory: { category: string; count: number }[];
  revenueByMonth: { month: string; revenue: number; unitsSold: number }[];
  topProducts: { title: string; totalRevenue: number; totalQty: number }[];
  orderStatus: { status: string; count: number }[];
  summary: {
    totalProducts: number;
    totalStock: number;
    estimatedValue: number;
    totalRevenue: number;
    totalUnitsSold: number;
  };
}

// ─── Palette ─────────────────────────────────────────────────────────────────
const CAT_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#ef4444", "#14b8a6"];
const STATUS_COLORS: Record<string, string> = {
  paid: "#10b981",
  pending: "#f59e0b",
  failed: "#ef4444",
};

// ─── Small helpers ────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  n >= 1_000_000
    ? `Rs ${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000
    ? `Rs ${(n / 1_000).toFixed(1)}K`
    : `Rs ${n}`;

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent: string;
}) {
  return (
    <div
      className="rounded-2xl border bg-white p-5 shadow-sm"
      style={{ borderTopColor: accent, borderTopWidth: 3 }}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-slate-800">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-4 text-base font-semibold text-slate-700 flex items-center gap-2">
      <span className="inline-block h-4 w-1 rounded-full bg-emerald-500" />
      {children}
    </h3>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-lg text-sm">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {typeof p.value === "number" && p.name?.toLowerCase().includes("revenue") ? fmt(p.value) : p.value}
        </p>
      ))}
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
export default function FarmerAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const user = useSelector((state: RootState) => state.user.user);

  useEffect(() => {
    if (!user?.token) {
      toast.error("Not authenticated");
      return;
    }
    axios
      .get(`${import.meta.env.VITE_API_URL}/product/farmer-analytics`, {
        headers: { Authorization: `Bearer ${user.token}` },
      })
      .then((res) => setData(res.data))
      .catch(() => toast.error("Failed to load analytics"))
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
        No analytics data available yet. Add products and make some sales to see insights.
      </div>
    );
  }

  const { summary, stockData, productsByCategory, revenueByMonth, topProducts, orderStatus } = data;

  // Ensure at least a placeholder for months with no data
  const monthLabels = revenueByMonth.map((r) => {
    const [year, month] = r.month.split("-");
    return {
      ...r,
      label: new Date(Number(year), Number(month) - 1).toLocaleString("default", { month: "short", year: "2-digit" }),
    };
  });

  return (
    <div className="space-y-8">

      {/* ── Summary cards ─────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
        <StatCard label="Products"      value={summary.totalProducts}               accent="#10b981" />
        <StatCard label="Total Stock"   value={summary.totalStock}                  accent="#3b82f6" />
        <StatCard label="Est. Value"    value={fmt(summary.estimatedValue)}         accent="#f59e0b" />
        <StatCard label="Revenue Earned" value={fmt(summary.totalRevenue)}          accent="#8b5cf6" sub="paid orders" />
        <StatCard label="Units Sold"    value={summary.totalUnitsSold}              accent="#14b8a6" />
      </div>

      {/* ── Row 1: Stock bar + Category pie ───────────── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">

        {/* Stock levels bar chart */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <SectionTitle>Stock Levels by Product</SectionTitle>
          {stockData.length === 0 ? (
            <p className="text-sm text-slate-400">No stock data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={stockData} margin={{ top: 4, right: 8, bottom: 40, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  angle={-35}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="stock" name="Stock" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Category distribution pie */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <SectionTitle>Products by Category</SectionTitle>
          {productsByCategory.length === 0 ? (
            <p className="text-sm text-slate-400">No category data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={productsByCategory}
                  dataKey="count"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  outerRadius={85}
                  innerRadius={45}
                  paddingAngle={3}
                  label={({ category, percent }) =>
                    `${category} ${(percent * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {productsByCategory.map((_, i) => (
                    <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => [`${v} products`, "Count"]} />
                <Legend iconType="circle" iconSize={8} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Row 2: Revenue area chart ─────────────────── */}
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <SectionTitle>Monthly Revenue &amp; Units Sold (Last 6 Months)</SectionTitle>
        {monthLabels.length === 0 ? (
          <p className="text-sm text-slate-400">No revenue data yet. Complete some orders to see trends.</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={monthLabels} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="unitsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} />
              <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={(v) => `Rs${(v/1000).toFixed(0)}K`} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "#94a3b8" }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={8} />
              <Area yAxisId="left" type="monotone" dataKey="revenue" name="Revenue" stroke="#8b5cf6" strokeWidth={2} fill="url(#revGrad)" dot={{ r: 4, fill: "#8b5cf6" }} />
              <Area yAxisId="right" type="monotone" dataKey="unitsSold" name="Units Sold" stroke="#10b981" strokeWidth={2} fill="url(#unitsGrad)" dot={{ r: 4, fill: "#10b981" }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Row 3: Top products bar + Order status pie ── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">

        {/* Top 5 products by revenue */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <SectionTitle>Top Products by Revenue</SectionTitle>
          {topProducts.length === 0 ? (
            <p className="text-sm text-slate-400">No sales recorded yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={topProducts}
                layout="vertical"
                margin={{ top: 4, right: 16, bottom: 4, left: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={(v) => `Rs${(v/1000).toFixed(0)}K`} />
                <YAxis dataKey="title" type="category" tick={{ fontSize: 11, fill: "#64748b" }} width={90} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="totalRevenue" name="Revenue" fill="#8b5cf6" radius={[0, 6, 6, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Order status donut */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <SectionTitle>Order Status Breakdown</SectionTitle>
          {orderStatus.length === 0 ? (
            <p className="text-sm text-slate-400">No orders associated with your products yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={orderStatus}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  outerRadius={85}
                  innerRadius={50}
                  paddingAngle={4}
                  label={({ status, count }) => `${status}: ${count}`}
                  labelLine={false}
                >
                  {orderStatus.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={STATUS_COLORS[entry.status] ?? CAT_COLORS[i % CAT_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number, name: string) => [v, name]} />
                <Legend iconType="circle" iconSize={8} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

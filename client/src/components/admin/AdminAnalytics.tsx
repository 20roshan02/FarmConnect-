import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  AreaChart, Area,
  LineChart, Line,
} from "recharts";
import { adminApi } from "../../services/adminApi";

// ─── Types ────────────────────────────────────────────────────────────────────
interface AdminAnalyticsData {
  productStatus: { pending: number; approved: number; rejected: number };
  productsByCategory: { category: string; count: number }[];
  userGrowth: { month: string; farmers: number; customers: number }[];
  revenueByMonth: { month: string; revenue: number; orders: number }[];
  topProducts: { title: string; totalRevenue: number; totalQty: number }[];
  summary: {
    totalRevenue: number;
    totalOrders: number;
    farmerCount: number;
    customerCount: number;
  };
}

// ─── Palette ──────────────────────────────────────────────────────────────────
const STATUS_COLORS = ["#b9861f", "#4b6b4c", "#a8502f"];   // pending, approved, rejected
const CAT_COLORS   = ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#ef4444", "#14b8a6"];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtRs = (n: number) =>
  n >= 1_000_000
    ? `Rs ${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000
    ? `Rs ${(n / 1_000).toFixed(1)}K`
    : `Rs ${n}`;

function monthLabel(iso: string) {
  const [y, m] = iso.split("-");
  return new Date(Number(y), Number(m) - 1).toLocaleString("default", {
    month: "short",
    year: "2-digit",
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function StatCard({
  label, value, sub, accent,
}: {
  label: string; value: string | number; sub?: string; accent: string;
}) {
  return (
    <div
      className="rounded-2xl border bg-white/90 p-5 shadow-[0_8px_22px_rgba(15,23,42,0.06)]"
      style={{ borderTopColor: accent, borderTopWidth: 3 }}
    >
      <p className="text-[11px] font-semibold uppercase tracking-widest text-[#6b7368]">{label}</p>
      <p className="mt-2 font-serif text-3xl font-semibold text-[#1f2a22]">{value}</p>
      {sub && <p className="mt-1 text-xs text-[#6b7368]">{sub}</p>}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#e4dfd3] bg-white/90 p-5 shadow-[0_8px_22px_rgba(15,23,42,0.06)]">
      <p className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#1f2a22]">
        <span className="inline-block h-3.5 w-1 rounded-full bg-[#b9861f]" />
        {title}
      </p>
      {children}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-[#e4dfd3] bg-white px-4 py-3 shadow-lg text-sm">
      <p className="mb-1 font-semibold text-[#1f2a22]">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}:{" "}
          {typeof p.value === "number" && p.name?.toLowerCase().includes("revenue")
            ? fmtRs(p.value)
            : p.value}
        </p>
      ))}
    </div>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function AdminAnalytics() {
  const [data, setData] = useState<AdminAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi
      .get("/analytics")
      .then((res) => setData(res.data))
      .catch(() => setError("Failed to load analytics data."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#b9861f]/30 border-t-[#b9861f]" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-[#a8502f] bg-white/90 p-6 text-sm text-[#a8502f]">
        {error ?? "No data available."}
      </div>
    );
  }

  const { summary, productStatus, productsByCategory, userGrowth, revenueByMonth, topProducts } = data;

  // Shape data for recharts
  const statusPieData = [
    { name: "Pending",  value: productStatus.pending,  color: STATUS_COLORS[0] },
    { name: "Approved", value: productStatus.approved, color: STATUS_COLORS[1] },
    { name: "Rejected", value: productStatus.rejected, color: STATUS_COLORS[2] },
  ];

  const userGrowthLabelled = userGrowth.map((u) => ({ ...u, label: monthLabel(u.month) }));
  const revenueLabelled    = revenueByMonth.map((r) => ({ ...r, label: monthLabel(r.month) }));

  return (
    <div className="space-y-8">

      {/* ── Summary cards ──────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Total Revenue"  value={fmtRs(summary.totalRevenue)}  accent="#b9861f" sub="paid orders" />
        <StatCard label="Total Orders"   value={summary.totalOrders}           accent="#4b6b4c" />
        <StatCard label="Farmers"        value={summary.farmerCount}           accent="#3b82f6" />
        <StatCard label="Customers"      value={summary.customerCount}         accent="#8b5cf6" />
      </div>

      {/* ── Row 1: Product status donut + Category bar ── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">

        {/* Product status donut */}
        <ChartCard title="Product Listing Status">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={statusPieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={95}
                innerRadius={52}
                paddingAngle={4}
                label={({ name, value }) => `${name}: ${value}`}
                labelLine={false}
              >
                {statusPieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number, name: string) => [v, name]} />
              <Legend iconType="circle" iconSize={9} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Category breakdown bar */}
        <ChartCard title="Products by Category">
          {productsByCategory.length === 0 ? (
            <p className="text-sm text-[#6b7368]">No products yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={productsByCategory}
                margin={{ top: 4, right: 8, bottom: 24, left: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f0ec" />
                <XAxis
                  dataKey="category"
                  tick={{ fontSize: 11, fill: "#6b7368" }}
                  angle={-30}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis tick={{ fontSize: 11, fill: "#6b7368" }} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Products" radius={[6, 6, 0, 0]} maxBarSize={42}>
                  {productsByCategory.map((_, i) => (
                    <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* ── Row 2: Revenue area chart ───────────────────── */}
      <ChartCard title="Monthly Revenue & Orders (Last 6 Months)">
        {revenueLabelled.length === 0 ? (
          <p className="text-sm text-[#6b7368]">No revenue data yet. Orders will appear here once paid.</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={revenueLabelled} margin={{ top: 4, right: 12, bottom: 4, left: 8 }}>
              <defs>
                <linearGradient id="adminRevGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#b9861f" stopOpacity={0.22} />
                  <stop offset="95%" stopColor="#b9861f" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="adminOrdGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#4b6b4c" stopOpacity={0.22} />
                  <stop offset="95%" stopColor="#4b6b4c" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f0ec" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#6b7368" }} />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 11, fill: "#6b7368" }}
                tickFormatter={(v) => `Rs${(v / 1000).toFixed(0)}K`}
              />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "#6b7368" }} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={9} />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="revenue"
                name="Revenue"
                stroke="#b9861f"
                strokeWidth={2}
                fill="url(#adminRevGrad)"
                dot={{ r: 4, fill: "#b9861f" }}
              />
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="orders"
                name="Orders"
                stroke="#4b6b4c"
                strokeWidth={2}
                fill="url(#adminOrdGrad)"
                dot={{ r: 4, fill: "#4b6b4c" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* ── Row 3: User growth line + Top products bar ── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">

        {/* User growth line chart */}
        <ChartCard title="User Registrations per Month (Last 6 Months)">
          {userGrowthLabelled.length === 0 ? (
            <p className="text-sm text-[#6b7368]">No user registration data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={userGrowthLabelled} margin={{ top: 4, right: 12, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f0ec" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#6b7368" }} />
                <YAxis tick={{ fontSize: 11, fill: "#6b7368" }} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={9} />
                <Line
                  type="monotone"
                  dataKey="farmers"
                  name="Farmers"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 4, fill: "#3b82f6" }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="customers"
                  name="Customers"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={{ r: 4, fill: "#8b5cf6" }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Top 5 products by revenue — horizontal bar */}
        <ChartCard title="Top 5 Products by Revenue">
          {topProducts.length === 0 ? (
            <p className="text-sm text-[#6b7368]">No sales recorded yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={topProducts}
                layout="vertical"
                margin={{ top: 4, right: 16, bottom: 4, left: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f0ec" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: "#6b7368" }}
                  tickFormatter={(v) => `Rs${(v / 1000).toFixed(0)}K`}
                />
                <YAxis
                  dataKey="title"
                  type="category"
                  tick={{ fontSize: 11, fill: "#1f2a22" }}
                  width={100}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="totalRevenue"
                  name="Revenue"
                  fill="#b9861f"
                  radius={[0, 6, 6, 0]}
                  maxBarSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

    </div>
  );
}

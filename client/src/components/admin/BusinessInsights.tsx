import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell,
} from "recharts";
import {
  fetchBusinessChurn,
  fetchBusinessRecommendations,
  fetchBusinessSalesRanking,
  type BusinessChurnCustomer,
  type BusinessChurnSummary,
  type BusinessRecommendation,
  type SalesRankingItem,
} from "../../services/adminApi";

const COLORS = ["#4b6b4c", "#b9861f", "#3b82f6", "#8b5cf6", "#a8502f", "#14b8a6"];
const STATUS_COLORS = {
  Active: "#4b6b4c",
  "At Risk": "#b9861f",
  Churned: "#a8502f",
  "Never Purchased": "#64748b",
};

const fmtRs = (value: number) =>
  value >= 1_000_000
    ? `Rs ${(value / 1_000_000).toFixed(1)}M`
    : value >= 1_000
    ? `Rs ${(value / 1_000).toFixed(1)}K`
    : `Rs ${value.toFixed(0)}`;

function formatDate(value: string | null) {
  if (!value) return "Never";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-[#e4dfd3] bg-white/90 p-5 shadow-[0_8px_22px_rgba(15,23,42,0.06)] ${className}`}>
      {children}
    </div>
  );
}

function ChartTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide text-[#6b7368]">
      <span className="inline-block h-3 w-1 rounded-full bg-[#b9861f]" />
      {children}
    </p>
  );
}

function Spinner() {
  return <div className="flex h-40 items-center justify-center"><div className="h-9 w-9 animate-spin rounded-full border-4 border-[#b9861f]/25 border-t-[#b9861f]" /></div>;
}

function Err({ message }: { message: string }) {
  return <div className="rounded-xl border border-[#a8502f]/40 bg-[#fff5f0] p-4 text-sm text-[#a8502f]">{message}</div>;
}

function Empty({ message }: { message: string }) {
  return <p className="rounded-xl border border-dashed border-[#e4dfd3] p-6 text-center text-sm text-[#6b7368]">{message}</p>;
}

function MetricPill({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="rounded-xl border bg-white p-4 text-center shadow-sm" style={{ borderTopColor: color, borderTopWidth: 3, borderColor: "#e4dfd3" }}>
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
      <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#6b7368]">{label}</p>
    </div>
  );
}

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-[#e4dfd3] bg-white px-4 py-3 text-sm shadow-lg">
      <p className="mb-1 font-semibold text-[#1f2a22]">{label}</p>
      {payload.map((item: any) => (
        <p key={item.dataKey} style={{ color: item.color }}>
          {item.name}: {item.dataKey === "totalRevenue" ? fmtRs(item.value) : item.value}
        </p>
      ))}
    </div>
  );
};

function SalesRankingPanel() {
  const [rankings, setRankings] = useState<SalesRankingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBusinessSalesRanking()
      .then((response) => setRankings(response.data.rankings ?? []))
      .catch(() => setError("Failed to load sales ranking."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (error) return <Err message={error} />;
  if (rankings.length === 0) return <Empty message="No paid product sales recorded yet." />;

  const chartData = rankings.slice(0, 10).map((item) => ({
    name: item.title.substring(0, 18),
    totalQty: item.totalQty,
  }));

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-[#e4dfd3] bg-[#fafaf8] px-4 py-3 text-[12px] text-[#6b7368]">
        Products are ranked from paid orders by quantity sold. Revenue is used as the tie breaker.
      </div>

      <Card>
        <ChartTitle>Top Products by Quantity Sold</ChartTitle>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f0ec" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11, fill: "#6b7368" }} allowDecimals={false} />
            <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: "#1f2a22" }} width={120} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="totalQty" name="Quantity Sold" fill="#4b6b4c" radius={[0, 6, 6, 0]} maxBarSize={26} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card>
        <ChartTitle>Sales Ranking</ChartTitle>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-[#f8f7f2]">
              <tr>
                {["Rank", "Product", "Category", "Quantity Sold", "Revenue", "Total Buyers"].map((heading) => (
                  <th key={heading} className="border-b border-[#e4dfd3] px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-[#6b7368] whitespace-nowrap">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rankings.map((item, index) => (
                <tr key={item.productId} className={index % 2 === 0 ? "bg-white" : "bg-[#fafaf8]"}>
                  <td className="border-b border-[#e4dfd3] px-3 py-2.5 font-bold text-[#b9861f]">#{item.rank}</td>
                  <td className="border-b border-[#e4dfd3] px-3 py-2.5 font-medium text-[#1f2a22]">{item.title}</td>
                  <td className="border-b border-[#e4dfd3] px-3 py-2.5 capitalize text-[#6b7368]">{item.category}</td>
                  <td className="border-b border-[#e4dfd3] px-3 py-2.5 font-semibold">{item.totalQty}</td>
                  <td className="border-b border-[#e4dfd3] px-3 py-2.5">{fmtRs(item.totalRevenue)}</td>
                  <td className="border-b border-[#e4dfd3] px-3 py-2.5">{item.totalBuyers}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function CustomerChurnPanel() {
  const [customers, setCustomers] = useState<BusinessChurnCustomer[]>([]);
  const [summary, setSummary] = useState<BusinessChurnSummary>({ Active: 0, "At Risk": 0, Churned: 0, "Never Purchased": 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBusinessChurn()
      .then((response) => {
        setCustomers(response.data.customers ?? []);
        setSummary(response.data.summary ?? {});
      })
      .catch(() => setError("Failed to load customer churn analysis."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (error) return <Err message={error} />;

  const cards = [
    { label: "Active Customers", value: summary.Active ?? 0, color: STATUS_COLORS.Active },
    { label: "At Risk Customers", value: summary["At Risk"] ?? 0, color: STATUS_COLORS["At Risk"] },
    { label: "Churned Customers", value: summary.Churned ?? 0, color: STATUS_COLORS.Churned },
    { label: "Never Purchased", value: summary["Never Purchased"] ?? 0, color: STATUS_COLORS["Never Purchased"] },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map((card) => <MetricPill key={card.label} {...card} />)}
      </div>

      <div className="rounded-xl border border-[#e4dfd3] bg-[#fafaf8] px-4 py-3 text-[12px] text-[#6b7368]">
        Status is based only on the most recent paid purchase: Active is 0-30 days, At Risk is 31-90 days, Churned is over 90 days, and Never Purchased means the customer has no paid orders.
      </div>

      {customers.length === 0 ? <Empty message="No customers found." /> : (
        <Card>
          <ChartTitle>Customer Churn Analysis</ChartTitle>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-[#f8f7f2]">
                <tr>
                  {["Customer", "Last Paid Purchase", "Days Since Purchase", "Paid Orders", "Total Spending", "Status"].map((heading) => (
                    <th key={heading} className="border-b border-[#e4dfd3] px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-[#6b7368] whitespace-nowrap">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {customers.map((customer, index) => (
                  <tr key={customer.userId} className={index % 2 === 0 ? "bg-white" : "bg-[#fafaf8]"}>
                    <td className="border-b border-[#e4dfd3] px-3 py-2.5">
                      <div className="font-medium text-[#1f2a22]">{customer.name}</div>
                      <div className="font-mono text-[10px] text-[#6b7368]">{customer.email}</div>
                    </td>
                    <td className="border-b border-[#e4dfd3] px-3 py-2.5 whitespace-nowrap text-[#6b7368]">{formatDate(customer.lastPaidPurchase)}</td>
                    <td className="border-b border-[#e4dfd3] px-3 py-2.5 text-[#6b7368]">{customer.daysSinceLastPurchase === null ? "-" : customer.daysSinceLastPurchase}</td>
                    <td className="border-b border-[#e4dfd3] px-3 py-2.5">{customer.totalOrders}</td>
                    <td className="border-b border-[#e4dfd3] px-3 py-2.5">{fmtRs(customer.totalSpend)}</td>
                    <td className="border-b border-[#e4dfd3] px-3 py-2.5">
                      <span className="inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ color: STATUS_COLORS[customer.status], backgroundColor: `${STATUS_COLORS[customer.status]}20` }}>
                        {customer.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function ProductRecommendationsPanel() {
  const [recommendations, setRecommendations] = useState<BusinessRecommendation[]>([]);
  const [categories, setCategories] = useState<{ category: string; purchaseCount: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBusinessRecommendations()
      .then((response) => {
        setRecommendations(response.data.recommendations ?? []);
        setCategories(response.data.categories ?? []);
      })
      .catch(() => setError("Failed to load product recommendations."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (error) return <Err message={error} />;
  if (recommendations.length === 0) return <Empty message="No paid purchase data yet. Popular products will appear after customers place orders." />;

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-[#e4dfd3] bg-[#fafaf8] px-4 py-3 text-[12px] text-[#6b7368]">
        Products are selected from the most purchased items and categories. Customers without purchase history receive popular products as the fallback.
      </div>

      <Card>
        <ChartTitle>Most Purchased Categories</ChartTitle>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={categories} margin={{ top: 4, right: 12, bottom: 24, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f0ec" />
            <XAxis dataKey="category" tick={{ fontSize: 11, fill: "#6b7368" }} angle={-25} textAnchor="end" interval={0} />
            <YAxis tick={{ fontSize: 11, fill: "#6b7368" }} allowDecimals={false} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="purchaseCount" name="Quantity Purchased" radius={[6, 6, 0, 0]} maxBarSize={40}>
              {categories.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {recommendations.map((recommendation, index) => (
          <Card key={recommendation.productId} className="flex flex-col gap-2">
            <div className="flex items-start justify-between">
              <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ color: COLORS[index % COLORS.length], backgroundColor: `${COLORS[index % COLORS.length]}18` }}>
                #{index + 1}
              </span>
              <span className="text-right text-[10px] text-[#6b7368]">{recommendation.totalBuyers} buyers</span>
            </div>
            {recommendation.images ? (
              <img src={recommendation.images} alt={recommendation.title} className="h-20 w-full rounded-lg object-cover" onError={(event) => { event.currentTarget.style.display = "none"; }} />
            ) : (
              <div className="flex h-20 w-full items-center justify-center rounded-lg bg-[#f1f0ec] text-2xl">&#127807;</div>
            )}
            <p className="line-clamp-2 text-[12px] font-semibold leading-tight text-[#1f2a22]">{recommendation.title}</p>
            <div className="flex items-center justify-between text-[11px] text-[#6b7368]">
              <span className="rounded-full bg-[#f1f0ec] px-1.5 py-0.5 capitalize">{recommendation.category}</span>
              <span className="font-semibold text-[#4b6b4c]">{recommendation.purchaseCount} purchased</span>
            </div>
            <p className="mt-auto text-[11px] leading-snug text-[#6b7368]">{recommendation.reason}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}

type Tab = "sales" | "churn" | "recommendations";

const TABS: { key: Tab; label: string; description: string }[] = [
  { key: "sales", label: "Sales Ranking", description: "Paid-order sales ranked by quantity sold, with revenue used to break ties." },
  { key: "churn", label: "Customer Churn Analysis", description: "Transparent customer status based on the number of days since the latest paid purchase." },
  { key: "recommendations", label: "Product Recommendations", description: "Popular products and categories selected from paid purchase activity." },
];

export default function BusinessInsights() {
  const [tab, setTab] = useState<Tab>("sales");
  const active = TABS.find((item) => item.key === tab)!;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#e4dfd3] bg-gradient-to-br from-[#f3f8ed] to-[#eef5ec] p-5">
        <h1 className="text-2xl font-bold text-[#1f2a22]">Business Insights</h1>
        <p className="mt-1 text-[13px] text-[#6b7368]">Rule-based marketplace insights for FarmConnect administrators.</p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-[#e4dfd3] pb-3">
        {TABS.map((item) => (
          <button key={item.key} onClick={() => setTab(item.key)}
            className={`rounded-full border px-4 py-2 text-[13px] font-medium transition-colors ${
              tab === item.key
                ? "border-[#b9861f] bg-[#fff6df] font-semibold text-[#1f2a22]"
                : "border-transparent text-[#6b7368] hover:border-[#e4dfd3] hover:bg-white"
            }`}>
            {item.label}
          </button>
        ))}
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-[#e4dfd3] bg-[#fafaf8] px-4 py-3">
        <span className="mt-0.5 text-[#b9861f]">i</span>
        <p className="text-[12px] text-[#6b7368]">{active.description}</p>
      </div>

      {tab === "sales" && <SalesRankingPanel />}
      {tab === "churn" && <CustomerChurnPanel />}
      {tab === "recommendations" && <ProductRecommendationsPanel />}
    </div>
  );
}

/**
 * adminDashboard.tsx — Modern redesign
 * Sections: Overview · Analytics · ML Insights · Products · Farmers · Customers
 */
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { useDispatch, useSelector } from "react-redux";
import { HiOutlineMenu, HiX } from "react-icons/hi";
import {
  HiOutlineHome, HiOutlineChartBar, HiOutlineSparkles, HiOutlineSquares2X2,
  HiOutlineUserGroup, HiOutlineUsers, HiOutlineShoppingBag, HiOutlineShieldCheck, HiOutlineGlobeAlt,
  HiOutlineArrowRightOnRectangle,
} from "react-icons/hi2";
import {
  fetchPendingProducts, fetchApprovedProducts, fetchRejectedProducts,
  approveProduct, rejectProduct, fetchCustomers,
  fetchFarmers, fetchFarmersByStatus, approveFarmer, rejectFarmer,
  type Product, type User, type FarmerUser, type FarmerApprovalStatus,
} from "../../services/adminApi";
import { adminApi } from "../../services/adminApi";
import { logout as logoutAction } from "../../utils/userSlice";
import { setCart } from "../../utils/cartSlice";
import type { RootState } from "../../utils/store";
import AdminAnalytics from "./AdminAnalytics";
import MLInsights from "./MLInsights";

// ─── Types ────────────────────────────────────────────────────────────────────
type ProductStatus = "pending" | "approved" | "rejected";
type SectionKey    = "dashboard" | "analytics" | "ml" | "products" | "farmers" | "customers";
type Activity = {
  title: string;
  time?: string;
  date?: string;
  icon: any;
};

const PRODUCT_TABS = [
  { key: "pending"  as ProductStatus, label: "Pending",  fetcher: fetchPendingProducts  },
  { key: "approved" as ProductStatus, label: "Approved", fetcher: fetchApprovedProducts },
  { key: "rejected" as ProductStatus, label: "Rejected", fetcher: fetchRejectedProducts },
];

const SECTIONS: { key: SectionKey; label: string; icon: any }[] = [
  { key: "dashboard",  label: "Overview",    icon: HiOutlineHome         },
  { key: "analytics",  label: "Analytics",   icon: HiOutlineChartBar     },
  { key: "ml",         label: "ML Insights", icon: HiOutlineSparkles     },
  { key: "products",   label: "Products",    icon: HiOutlineSquares2X2   },
  { key: "farmers",    label: "Farmers",     icon: HiOutlineUserGroup    },
  { key: "customers",  label: "Customers",   icon: HiOutlineUsers        },
];

const STATUS_COLORS: Record<ProductStatus, string> = {
  pending:  "#d97706",
  approved: "#16a34a",
  rejected: "#dc2626",
};
const FARMER_STATUS_COLORS: Record<FarmerApprovalStatus, string> = {
  pending:  "#d97706",
  approved: "#16a34a",
  rejected: "#dc2626",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function initials(name = "") {
  return name.split(" ").filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join("");
}
function errMsg(err: unknown): string {
  if (err && typeof err === "object" && "response" in err) {
    const r = (err as any).response?.data?.message;
    if (r) return r;
  }
  if (err instanceof Error) return err.message;
  return "Request failed";
}

function relativeTime(date?: string) {
  if (!date) return "Recent activity";
  const elapsed = Math.max(0, Date.now() - new Date(date).getTime());
  const minutes = Math.floor(elapsed / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

// ─── Shared primitives ────────────────────────────────────────────────────────
function Spinner() {
  return <div className="flex h-40 items-center justify-center"><div className="h-9 w-9 animate-spin rounded-full border-4 border-[#b9861f]/25 border-t-[#b9861f]" /></div>;
}
function Empty({ msg }: { msg: string }) {
  return <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-400">{msg}</div>;
}
function Err({ msg }: { msg: string }) {
  return <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">{msg}</div>;
}

function StatusBadge({ status, map }: { status: string; map: Record<string, string> }) {
  const color = map[status] || "#6b7280";
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize"
      style={{ color, backgroundColor: color + "15" }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {status}
    </span>
  );
}

function TabBar({ tabs, active, onSelect }: { tabs: { key: string; label: string }[]; active: string; onSelect: (k: any) => void }) {
  return (
    <div className="mb-5 flex flex-wrap gap-2 border-b border-slate-100 pb-3">
      {tabs.map(t => (
        <button key={t.key} onClick={() => onSelect(t.key)}
          className={`rounded-full border px-4 py-1.5 text-[13px] font-medium transition-colors ${
            active === t.key
              ? "border-[#b9861f] bg-amber-50 font-semibold text-slate-900"
              : "border-transparent text-slate-500 hover:border-slate-200 hover:bg-white"
          }`}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function AdminSidebar({
  section, onSelect, onLogout, adminName, adminEmail,
}: {
  section: SectionKey;
  onSelect: (s: SectionKey) => void;
  onLogout: () => void;
  adminName: string;
  adminEmail: string;
}) {
  const initials = (name = "") =>
    name.split(" ").filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join("") || "A";

  return (
    <aside className="flex h-full w-full flex-col bg-[#0c1a12]">
      {/* Brand */}
      <div className="flex items-center gap-3 border-b border-white/8 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-md">
          <HiOutlineGlobeAlt className="text-white" size={18} />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400/70">FarmConnect</p>
          <p className="text-sm font-bold text-white">Admin Panel</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {SECTIONS.map(({ key, label, icon: Icon }) => {
          const active = section === key;
          return (
            <button key={key} onClick={() => onSelect(key)}
              className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all
                ${active
                  ? "bg-amber-500/20 text-amber-300 shadow-[inset_3px_0_0_#fbbf24]"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}>
              <Icon size={17} className={active ? "text-amber-400" : "text-slate-500 group-hover:text-slate-300"} />
              {label}
            </button>
          );
        })}
      </nav>

      {/* User card + logout */}
      <div className="border-t border-white/8 px-4 py-4 space-y-2">
        {/* Admin info */}
        <div className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-xs font-bold text-white select-none">
            {initials(adminName)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-white">{adminName || "Administrator"}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <HiOutlineShieldCheck size={11} className="text-amber-400 shrink-0" />
              <p className="truncate text-[11px] text-amber-400/80">{adminEmail || "Full access"}</p>
            </div>
          </div>
        </div>

        {/* Logout button */}
        <button
          onClick={onLogout}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[13px] font-semibold text-slate-300 transition-all hover:bg-red-500/20 hover:border-red-500/30 hover:text-red-400"
        >
          <HiOutlineArrowRightOnRectangle size={15} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}

// ─── Dashboard overview ───────────────────────────────────────────────────────
function DashboardPanel({
  onOpenTab,
  onOpenSection,
}: {
  onOpenTab: (tab: ProductStatus) => void;
  onOpenSection: (section: SectionKey) => void;
}) {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<{
    farmerCount: number;
    customerCount: number;
    totalOrders: number;
    totalProducts: number;
  } | null>(null);
  const [statusCounts, setStatusCounts] = useState<Record<ProductStatus, number> | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(null);
    Promise.all([
      adminApi.get("/analytics"),
      ...PRODUCT_TABS.map(t => t.fetcher()),
      fetchFarmers(),
      fetchCustomers(),
    ])
      .then(([analytics, pendingResponse, approvedResponse, rejectedResponse, farmersResponse, customersResponse]) => {
        if (cancelled) return;
        type TimestampedRecord = { createdAt?: string; updatedAt?: string };
        const pendingProducts = (pendingResponse.data as { products: Product[] }).products;
        const approvedProducts = (approvedResponse.data as { products: Product[] }).products;
        const rejectedProducts = (rejectedResponse.data as { products: Product[] }).products;
        const farmers = (farmersResponse.data as { farmers?: (User & TimestampedRecord)[] }).farmers || [];
        const customers = (customersResponse.data as { customers?: (User & TimestampedRecord)[] }).customers || [];
        const counts = {} as Record<ProductStatus, number>;
        counts.pending = pendingProducts.length;
        counts.approved = approvedProducts.length;
        counts.rejected = rejectedProducts.length;
        setStatusCounts(counts);
        setSummary({
          farmerCount: analytics.data.summary.farmerCount,
          customerCount: analytics.data.summary.customerCount,
          totalOrders: analytics.data.summary.totalOrders,
          totalProducts: analytics.data.productStatus.pending + analytics.data.productStatus.approved + analytics.data.productStatus.rejected,
        });

        const latest = <T extends TimestampedRecord>(items: T[]) =>
          [...items].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())[0];
        const latestFarmer = latest(farmers);
        const latestCustomer = latest(customers);
        const latestProduct = latest([
          ...pendingProducts,
          ...approvedProducts,
          ...rejectedProducts,
        ] as (Product & TimestampedRecord)[]);
        const latestApproved = latest(approvedProducts as (Product & TimestampedRecord)[]);
        const nextActivities: Activity[] = [
          latestFarmer && { title: `Farmer registration: ${latestFarmer.name}`, date: latestFarmer.createdAt, icon: HiOutlineUserGroup },
          latestProduct && { title: `Product listing: ${latestProduct.title}`, date: latestProduct.createdAt, icon: HiOutlineSquares2X2 },
          latestApproved && { title: `Product approved: ${latestApproved.title}`, date: latestApproved.updatedAt || latestApproved.createdAt, icon: HiOutlineShieldCheck },
          latestCustomer && { title: `Customer registration: ${latestCustomer.name}`, date: latestCustomer.createdAt, icon: HiOutlineUsers },
          analytics.data.summary.totalOrders > 0 && { title: "Customer order activity", time: `${analytics.data.summary.totalOrders} paid orders`, icon: HiOutlineShoppingBag },
        ].filter(Boolean) as Activity[];
        setActivities(nextActivities.sort((a, b) => {
          if (!a.date) return 1;
          if (!b.date) return -1;
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        }).slice(0, 5));
      })
      .catch(err => { if (!cancelled) setError(errMsg(err)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) return <Spinner />;
  if (error)   return <Err msg={error} />;
  if (!summary || !statusCounts) return null;

  const cards = [
    { label: "Total Farmers", count: summary.farmerCount, subtitle: "Registered farmers", icon: HiOutlineUserGroup, gradient: "from-emerald-700 to-green-500" },
    { label: "Total Customers", count: summary.customerCount, subtitle: "Registered customers", icon: HiOutlineUsers, gradient: "from-teal-700 to-emerald-500" },
    { label: "Total Products", count: summary.totalProducts, subtitle: "Across all statuses", icon: HiOutlineSquares2X2, gradient: "from-orange-700 to-amber-500" },
    { label: "Total Orders", count: summary.totalOrders, subtitle: "Paid orders", icon: HiOutlineShoppingBag, gradient: "from-amber-700 to-orange-500" },
  ];
  const quickActions = [
    { label: "Review Products", subtitle: "Approve or reject listings", section: "products" as SectionKey, icon: HiOutlineSquares2X2 },
    { label: "Manage Farmers", subtitle: "Review farmer access", section: "farmers" as SectionKey, icon: HiOutlineUserGroup },
    { label: "Manage Customers", subtitle: "View customer accounts", section: "customers" as SectionKey, icon: HiOutlineUsers },
    { label: "View Analytics", subtitle: "Explore platform trends", section: "analytics" as SectionKey, icon: HiOutlineChartBar },
  ];

  const openQuickAction = (section: SectionKey) => {
    navigate("/admin-dashboard");
    onOpenSection(section);
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, count, subtitle, icon: Icon, gradient }) => (
          <div key={label} className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} p-5 text-white shadow-sm`}>
            <Icon className="absolute -right-3 -top-3 h-24 w-24 text-white/10" />
            <div className="relative">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
                <Icon size={21} />
              </div>
              <p className="mt-5 text-sm font-medium text-white/80">{label}</p>
              <p className="mt-1 text-3xl font-bold tracking-tight">{count}</p>
              <p className="mt-1 text-xs text-white/70">{subtitle}</p>
            </div>
          </div>
        ))}
      </div>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Product Approval Queue</h2>
            <p className="mt-1 text-sm text-slate-500">Review product listings by their current status.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {PRODUCT_TABS.map(tab => {
            const color = STATUS_COLORS[tab.key];
            return (
              <div key={tab.key} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{tab.label}</p>
                    <p className="mt-1 text-2xl font-bold" style={{ color }}>{statusCounts[tab.key]}</p>
                  </div>
                  <span className="mt-1 h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                </div>
                <p className="mt-1 text-xs text-slate-500">{tab.label} product listings</p>
                <button onClick={() => onOpenTab(tab.key)} className="mt-3 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-amber-400 hover:bg-amber-50 hover:text-slate-900">
                  View Listings
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5">
          <h2 className="text-lg font-bold text-slate-900">Recent Activity</h2>
          <p className="mt-1 text-sm text-slate-500">The latest activity across your marketplace.</p>
        </div>
        {activities.length === 0 ? (
          <Empty msg="No recent activity available." />
        ) : (
          <div className="ml-3 border-l border-slate-200">
            {activities.map((activity, index) => {
              const Icon = activity.icon;
              return (
                <div key={`${activity.title}-${index}`} className="relative flex gap-4 pb-5 pl-6 last:pb-0">
                  <div className="absolute -left-4 flex h-8 w-8 items-center justify-center rounded-full border-4 border-white bg-amber-100 text-amber-700">
                    <Icon size={14} />
                  </div>
                  <div className="min-w-0 pt-1">
                    <p className="truncate text-sm font-semibold text-slate-800">{activity.title}</p>
                    <p className="mt-1 text-xs text-slate-400">{activity.time || relativeTime(activity.date)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <div className="mb-4">
          <h2 className="text-lg font-bold text-slate-900">Quick Actions</h2>
          <p className="mt-1 text-sm text-slate-500">Jump to a common admin task.</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {quickActions.map(({ label, subtitle, section, icon: Icon }) => (
            <button
              key={label}
              onClick={() => openQuickAction(section)}
              className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700 transition group-hover:bg-amber-100">
                <Icon size={20} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-slate-800">{label}</span>
                <span className="mt-0.5 block truncate text-xs text-slate-500">{subtitle}</span>
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

// ─── Products panel ───────────────────────────────────────────────────────────
function ProductsPanel({ tab, setTab }: { tab: ProductStatus; setTab: (t: ProductStatus) => void }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [busyId, setBusyId]     = useState<string | null>(null);

  const activeTab = PRODUCT_TABS.find(t => t.key === tab)!;

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setProducts((await activeTab.fetcher()).data.products || []); }
    catch (err) { setError(errMsg(err)); }
    finally { setLoading(false); }
  }, [activeTab]);

  useEffect(() => { load(); }, [load]);

  const handleDecision = async (id: string, decision: "approve" | "reject") => {
    setBusyId(id);
    try {
      if (decision === "approve") await approveProduct(id); else await rejectProduct(id);
      setProducts(prev => prev.filter(p => p._id !== id));
    } catch (err) { setError(errMsg(err)); }
    finally { setBusyId(null); }
  };

  return (
    <div>
      <TabBar tabs={PRODUCT_TABS} active={tab} onSelect={setTab} />
      {error && <Err msg={error} />}
      {loading ? <Spinner /> : products.length === 0 ? <Empty msg={`No ${tab} listings right now.`} /> : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-slate-50">
                <tr>
                  {["Product", "Farmer", "Email", "Status", ...(tab === "pending" ? ["Decision"] : [])].map(h => (
                    <th key={h} className="border-b border-slate-200 px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {products.map((p, i) => (
                  <tr key={p._id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/40"}>
                    <td className="border-b border-slate-100 px-4 py-3.5 font-semibold text-slate-900">{p.title}</td>
                    <td className="border-b border-slate-100 px-4 py-3.5 text-slate-700">{p.farmer?.name || "—"}</td>
                    <td className="border-b border-slate-100 px-4 py-3.5 font-mono text-xs text-slate-400">{p.farmer?.email || "—"}</td>
                    <td className="border-b border-slate-100 px-4 py-3.5">
                      <StatusBadge status={p.status} map={STATUS_COLORS} />
                    </td>
                    {tab === "pending" && (
                      <td className="border-b border-slate-100 px-4 py-3.5">
                        <div className="flex gap-2">
                          <button disabled={busyId === p._id} onClick={() => handleDecision(p._id, "approve")}
                            className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-green-700 disabled:opacity-50">Approve</button>
                          <button disabled={busyId === p._id} onClick={() => handleDecision(p._id, "reject")}
                            className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50">Reject</button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Farmers panel ────────────────────────────────────────────────────────────
const FARMER_TABS: { key: FarmerApprovalStatus; label: string }[] = [
  { key: "pending",  label: "Pending"  },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

function FarmersPanel() {
  const [tab,     setTab]     = useState<FarmerApprovalStatus>("pending");
  const [farmers, setFarmers] = useState<FarmerUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [busyId,  setBusyId]  = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setFarmers((await fetchFarmersByStatus(tab)).data.farmers || []); }
    catch (err) { setError(errMsg(err)); }
    finally { setLoading(false); }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  const handleDecision = async (id: string, decision: "approve" | "reject") => {
    setBusyId(id);
    try {
      if (decision === "approve") await approveFarmer(id); else await rejectFarmer(id);
      setFarmers(prev => prev.filter(f => f._id !== id));
    } catch (err) { setError(errMsg(err)); }
    finally { setBusyId(null); }
  };

  return (
    <div>
      <TabBar tabs={FARMER_TABS} active={tab} onSelect={setTab} />
      {error && <Err msg={error} />}
      {loading ? <Spinner /> : farmers.length === 0 ? <Empty msg={`No ${tab} farmer registrations.`} /> : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-slate-50">
                <tr>
                  {["Farmer", "Email", "Registered", "Status", ...(tab === "pending" ? ["Decision"] : [])].map(h => (
                    <th key={h} className="border-b border-slate-200 px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {farmers.map((f, i) => {
                  const joined = f.createdAt ? new Date(f.createdAt).toLocaleDateString("en-NP", { year:"numeric", month:"short", day:"numeric" }) : "—";
                  return (
                    <tr key={f._id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/40"}>
                      <td className="border-b border-slate-100 px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0c1a12] text-[12px] font-bold text-white">
                            {initials(f.name)}
                          </div>
                          <span className="font-semibold text-slate-900">{f.name}</span>
                        </div>
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3.5 font-mono text-xs text-slate-400">{f.email}</td>
                      <td className="border-b border-slate-100 px-4 py-3.5 text-xs text-slate-500">{joined}</td>
                      <td className="border-b border-slate-100 px-4 py-3.5">
                        <StatusBadge status={f.approvalStatus} map={FARMER_STATUS_COLORS} />
                      </td>
                      {tab === "pending" && (
                        <td className="border-b border-slate-100 px-4 py-3.5">
                          <div className="flex gap-2">
                            <button disabled={busyId === f._id} onClick={() => handleDecision(f._id, "approve")}
                              className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-green-700 disabled:opacity-50">Approve</button>
                            <button disabled={busyId === f._id} onClick={() => handleDecision(f._id, "reject")}
                              className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50">Reject</button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Customers panel ──────────────────────────────────────────────────────────
function CustomersPanel() {
  const [people,  setPeople]  = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [search,  setSearch]  = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(null);
    fetchCustomers()
      .then(res => { if (!cancelled) setPeople((res.data as any).customers || []); })
      .catch(err => { if (!cancelled) setError(errMsg(err)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) return <Spinner />;
  if (error)   return <Err msg={error} />;
  if (people.length === 0) return <Empty msg="No customers on record yet." />;

  const filtered = search.trim()
    ? people.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.email.toLowerCase().includes(search.toLowerCase()))
    : people;

  return (
    <div className="space-y-4">
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customers…"
        className="w-full max-w-xs rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map(person => (
          <div key={person._id} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 text-[13px] font-bold text-white select-none">
              {initials(person.name)}
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold text-slate-900">{person.name}</p>
              <p className="truncate text-xs text-slate-400 font-mono">{person.email}</p>
            </div>
          </div>
        ))}
      </div>
      {filtered.length === 0 && <Empty msg="No customers match your search." />}
    </div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────
function OverviewBanner() {
  const currentDate = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <section className="mb-6 overflow-hidden rounded-2xl bg-[#0c1a12] px-5 py-6 shadow-sm sm:px-7 sm:py-7">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-amber-300">{currentDate}</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">Welcome back, Admin 👋</h1>
          <p className="mt-2 text-sm text-slate-300">Here is what is happening across FarmConnect today.</p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold text-emerald-300">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          System Online
        </span>
      </div>
    </section>
  );
}

const SECTION_META: Record<SectionKey, { title: string; desc: string }> = {
  dashboard:  { title: "Overview",       desc: "Product listing counts and quick access to approval queues." },
  analytics:  { title: "Analytics",      desc: "Platform-wide revenue, orders, user growth, and product trends." },
  ml:         { title: "ML Insights",    desc: "AI-powered churn prediction, customer segmentation, and recommendations." },
  products:   { title: "Product Listings", desc: "Review farmer-submitted listings and record your approval decision." },
  farmers:    { title: "Farmers",        desc: "Review farmer registrations and manage platform access." },
  customers:  { title: "Customers",      desc: "All registered customers on the marketplace." },
};

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const navigate     = useNavigate();
  const dispatch     = useDispatch();
  const adminUser    = useSelector((state: RootState) => state.user.user);

  const [section,    setSection]    = useState<SectionKey>("dashboard");
  const [productTab, setProductTab] = useState<ProductStatus>("pending");
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    dispatch(logoutAction());
    dispatch(setCart([]));
    navigate("/login");
  };

  const openProductTab = (tab: ProductStatus) => { setProductTab(tab); setSection("products"); };
  const changeSection  = (s: SectionKey)     => { setSection(s); setMobileOpen(false); };

  const meta = SECTION_META[section];

  return (
    <div className="flex min-h-screen bg-slate-50">

      {/* Mobile topbar */}
      <div className="fixed inset-x-0 top-0 z-30 flex items-center justify-between border-b bg-white/90 px-4 py-3 backdrop-blur-md md:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500 text-white text-xs font-bold">A</div>
          <span className="font-bold text-slate-800">Admin Panel</span>
        </div>
        <button onClick={() => setMobileOpen(true)} className="rounded-xl border border-slate-200 p-2 text-slate-600">
          <HiOutlineMenu size={20} />
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="flex h-full w-72 flex-col bg-[#0c1a12] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <span className="font-bold text-white">Admin Panel</span>
              <button onClick={() => setMobileOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:text-white"><HiX size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <AdminSidebar
                section={section}
                onSelect={changeSection}
                onLogout={handleLogout}
                adminName={adminUser?.name || ""}
                adminEmail={adminUser?.email || ""}
              />
            </div>
          </div>
          <div className="flex-1 bg-black/50" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden md:flex w-60 shrink-0 flex-col min-h-screen sticky top-0">
        <AdminSidebar
          section={section}
          onSelect={changeSection}
          onLogout={handleLogout}
          adminName={adminUser?.name || ""}
          adminEmail={adminUser?.email || ""}
        />
      </div>

      {/* Main */}
      <main className="mt-14 flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 md:mt-0">

        {/* Page header */}
        {section === "dashboard" ? (
          <OverviewBanner />
        ) : (
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900">{meta.title}</h1>
            <p className="mt-1 text-sm text-slate-500">{meta.desc}</p>
          </div>
        )}

        {section === "dashboard"  && <DashboardPanel onOpenTab={openProductTab} onOpenSection={changeSection} />}
        {section === "analytics"  && <AdminAnalytics />}
        {section === "ml"         && <MLInsights />}
        {section === "products"   && <ProductsPanel tab={productTab} setTab={setProductTab} />}
        {section === "farmers"    && <FarmersPanel />}
        {section === "customers"  && <CustomersPanel />}
      </main>
    </div>
  );
}

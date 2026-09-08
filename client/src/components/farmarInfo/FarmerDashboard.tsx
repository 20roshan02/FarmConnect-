/**
 * FarmerDashboard.tsx  — Modern redesign
 * Views: dashboard (stats + add-product + recent) · analytics · ML insights
 */
import { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { useNavigate } from "react-router";
import { useSelector } from "react-redux";
import { HiOutlineMenu, HiX } from "react-icons/hi";
import {
  HiOutlineSquares2X2, HiOutlineCubeTransparent, HiOutlineBanknotes,
  HiOutlineTag, HiOutlinePhoto, HiOutlineMapPin, HiOutlinePlusCircle,
  HiOutlineChartBar, HiOutlineSparkles,
} from "react-icons/hi2";
import FarmerAnalytics from "./FarmerAnalytics";
import MLFarmerInsights from "./MLFarmerInsights";
import FarmerSidebar from "./FarmerSidebar";
import type { RootState } from "../../utils/store";

type Product = {
  _id: string; title: string; price: number; stock: number;
  category: string; location: string; description?: string; images?: string;
};

type ActiveView = "dashboard" | "analytics" | "ml";

const CATEGORY_OPTIONS = [
  { value: "vegetables", label: "Vegetables" },
  { value: "fruits",     label: "Fruits"     },
  { value: "grains",     label: "Grains"     },
  { value: "dairy",      label: "Dairy"      },
  { value: "other",      label: "Other"      },
];

const CAT_COLOR: Record<string, string> = {
  vegetables:"#16a34a", fruits:"#d97706", grains:"#92400e", dairy:"#2563eb", other:"#7c3aed",
};

const inputCls = "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 placeholder:text-slate-300";

function StatCard({ label, value, icon: Icon, gradient }: { label:string; value:string|number; icon:any; gradient:string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className={`absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white shadow-sm`}>
        <Icon size={18} />
      </div>
      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

export default function FarmerDashboard() {
  const navigate    = useNavigate();
  const user        = useSelector((state: RootState) => state.user.user);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeView, setActiveView] = useState<ActiveView>("dashboard");
  const [products,   setProducts]   = useState<Product[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // form
  const [title, setTitle]           = useState("");
  const [price, setPrice]           = useState("");
  const [stock, setStock]           = useState("");
  const [category, setCategory]     = useState("");
  const [location, setLocation]     = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage]           = useState<File | null>(null);

  const token = () => user?.token || localStorage.getItem("token") || "";

  const fetchProducts = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/product/my-products`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      setProducts(res.data?.products || []);
    } catch { setProducts([]); }
  };

  useEffect(() => { fetchProducts(); }, []);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = token(); if (!t) { toast.error("Please login again"); return; }
    try {
      setSubmitting(true);
      const fd = new FormData();
      fd.append("title",       title.trim());
      fd.append("description", description.trim());
      fd.append("price",       String(Number(price)));
      fd.append("stock",       String(Number(stock)));
      fd.append("category",    category.trim());
      fd.append("location",    location.trim());
      if (image) fd.append("image", image);
      await axios.post(`${import.meta.env.VITE_API_URL}/product`, fd, {
        headers: { Authorization: `Bearer ${t}`, "Content-Type": "multipart/form-data" },
      });
      toast.success("Product listed successfully ✅");
      fetchProducts();
      setTitle(""); setPrice(""); setStock(""); setCategory("");
      setLocation(""); setDescription(""); setImage(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to add product");
    } finally { setSubmitting(false); }
  };

  const totalStock = products.reduce((s, p) => s + p.stock, 0);
  const totalValue = products.reduce((s, p) => s + p.price * p.stock, 0);
  const categories = new Set(products.map(p => p.category)).size;

  const NAV_ITEMS = [
    { label: "Dashboard",   view: "dashboard" as ActiveView, to: null },
    { label: "Analytics",   view: "analytics" as ActiveView, to: null },
    { label: "ML Insights", view: "ml"        as ActiveView, to: null },
    { label: "Products",    view: null, to: "/farmer/myProducts" },
    { label: "Orders",      view: null, to: "/farmer/orders"     },
    { label: "Settings",    view: null, to: "/farmer/farmerSetting" },
  ];

  const handleNav = (view: ActiveView | null, to: string | null) => {
    if (view) setActiveView(view);
    else if (to) navigate(to);
    setMobileOpen(false);
  };

  const initials = (name = "") => name.split(" ").filter(Boolean).slice(0,2).map(p=>p[0].toUpperCase()).join("");

  return (
    <div className="flex min-h-screen bg-slate-50">

      {/* Mobile topbar */}
      <div className="fixed inset-x-0 top-0 z-30 flex items-center justify-between border-b bg-white/90 px-4 py-3 backdrop-blur-md md:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white text-xs font-bold">F</div>
          <span className="font-bold text-slate-800">Farmer Panel</span>
        </div>
        <button onClick={() => setMobileOpen(true)} className="rounded-xl border border-slate-200 p-2 text-slate-600">
          <HiOutlineMenu size={20} />
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="flex h-full w-72 flex-col bg-[#0f1f17] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <span className="font-bold text-white">Farmer Panel</span>
              <button onClick={() => setMobileOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:text-white">
                <HiX size={20} />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
              {NAV_ITEMS.map(({ label, view, to }) => {
                const active = view ? activeView === view : false;
                return (
                  <button key={label} onClick={() => handleNav(view, to)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all
                      ${active ? "bg-emerald-500/20 text-emerald-300" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}>
                    {label}
                  </button>
                );
              })}
            </nav>
            {user && (
              <div className="border-t border-white/10 px-4 py-4">
                <div className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-xs font-bold text-white">
                    {initials(user.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{user.name}</p>
                    <p className="truncate text-[11px] text-slate-400">{user.email}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="flex-1 bg-black/50" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      <FarmerSidebar />

      {/* Main */}
      <main className="mt-14 flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 md:mt-0">

        {/* Page header banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 p-6 shadow-lg mb-6">
          <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/5 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-8 -left-8 h-36 w-36 rounded-full bg-teal-400/10 blur-2xl" />
          <div className="relative">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-emerald-200/70">Farm Workspace</p>
            <h1 className="mt-1 text-2xl font-bold text-white">
              {activeView === "analytics" ? "Analytics" : activeView === "ml" ? "ML Insights" : "Farmer Dashboard"}
            </h1>
            <p className="mt-1 text-sm text-emerald-100/70">
              {activeView === "analytics"
                ? "Charts and insights about your products, stock, and earnings."
                : activeView === "ml"
                ? "AI-powered demand forecasting and market signals."
                : "Manage products, monitor stock, and grow your storefront."}
            </p>
          </div>
          {/* Tab pills */}
          <div className="relative mt-4 flex flex-wrap gap-2">
            {[
              { key:"dashboard", label:"Overview" },
              { key:"analytics", label:"Analytics" },
              { key:"ml",        label:"ML Insights" },
            ].map(({ key, label }) => (
              <button key={key} onClick={() => setActiveView(key as ActiveView)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  activeView === key
                    ? "bg-white text-emerald-700 shadow-sm"
                    : "bg-white/15 text-white hover:bg-white/25"
                }`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Analytics */}
        {activeView === "analytics" && <FarmerAnalytics />}

        {/* ML */}
        {activeView === "ml" && <MLFarmerInsights />}

        {/* Dashboard */}
        {activeView === "dashboard" && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
              <StatCard label="Total Products" value={products.length}             icon={HiOutlineSquares2X2}     gradient="from-emerald-400 to-teal-500"   />
              <StatCard label="Total Stock"    value={totalStock}                  icon={HiOutlineCubeTransparent} gradient="from-sky-400 to-blue-500"        />
              <StatCard label="Est. Value"     value={`Rs ${totalValue.toLocaleString()}`} icon={HiOutlineBanknotes} gradient="from-amber-400 to-orange-500" />
              <StatCard label="Categories"     value={categories}                  icon={HiOutlineTag}             gradient="from-violet-400 to-purple-500"   />
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
              {/* Add product form */}
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/50 px-6 py-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100">
                    <HiOutlinePlusCircle size={17} className="text-emerald-600" />
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-900">List a Product</h2>
                    <p className="text-[12px] text-slate-500">Publish a new listing to the marketplace</p>
                  </div>
                </div>

                <form onSubmit={handleAddProduct} className="p-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-400">Product Name *</label>
                      <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Organic Tomatoes" className={inputCls} required />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-400">Price (Rs) *</label>
                      <input value={price} onChange={e=>setPrice(e.target.value)} type="number" min="0" placeholder="0" className={inputCls} required />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-400">Stock Quantity *</label>
                      <input value={stock} onChange={e=>setStock(e.target.value)} type="number" min="0" placeholder="0" className={inputCls} required />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-400">Category *</label>
                      <select value={category} onChange={e=>setCategory(e.target.value)} className={inputCls} required>
                        <option value="">Select category…</option>
                        {CATEGORY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-400">Location *</label>
                      <div className="relative">
                        <HiOutlineMapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                        <input value={location} onChange={e=>setLocation(e.target.value)} placeholder="e.g. Kathmandu" className={inputCls + " pl-9"} required />
                      </div>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-400">Description *</label>
                      <textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="Describe your product…" rows={3} className={inputCls + " resize-none"} required />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-400">Product Image</label>
                      <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 py-5 transition hover:border-emerald-300 hover:bg-emerald-50/30">
                        {image ? (
                          <div className="flex flex-col items-center gap-2">
                            <img src={URL.createObjectURL(image)} className="h-24 w-24 rounded-xl object-cover ring-2 ring-emerald-200" alt="preview" />
                            <span className="text-xs font-medium text-emerald-600">{image.name}</span>
                          </div>
                        ) : (
                          <>
                            <HiOutlinePhoto size={28} className="text-slate-300 mb-1" />
                            <p className="text-xs text-slate-400">Click to upload an image</p>
                          </>
                        )}
                        <input type="file" accept="image/*" className="sr-only" onChange={e => setImage(e.target.files?.[0] || null)} />
                      </label>
                    </div>
                  </div>

                  <button type="submit" disabled={submitting}
                    className="mt-5 w-full rounded-xl bg-emerald-600 py-3 font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    {submitting
                      ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />Publishing…</>
                      : <><HiOutlinePlusCircle size={17} />Publish Listing</>
                    }
                  </button>
                </form>
              </div>

              {/* Recent products */}
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-5 py-4">
                  <h2 className="font-bold text-slate-900">Recent Listings</h2>
                  <button onClick={() => navigate("/farmer/myProducts")}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-600 transition hover:bg-slate-50">
                    View All
                  </button>
                </div>

                <div className="divide-y divide-slate-50 p-2">
                  {products.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <HiOutlineSquares2X2 size={32} className="text-slate-200 mb-2" />
                      <p className="text-sm text-slate-400">No products yet.</p>
                      <p className="text-xs text-slate-300">Add your first listing to get started.</p>
                    </div>
                  ) : (
                    products.slice(0, 6).map(p => {
                      const cc = CAT_COLOR[p.category] || "#6b7280";
                      return (
                        <div key={p._id} className="flex items-center gap-3 rounded-xl px-3 py-3 transition hover:bg-slate-50">
                          {p.images ? (
                            <img src={p.images} alt={p.title} className="h-10 w-10 rounded-xl object-cover shrink-0" />
                          ) : (
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg" style={{ backgroundColor: cc + "18" }}>🌿</div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900">{p.title}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold capitalize" style={{ color: cc, backgroundColor: cc + "18" }}>{p.category}</span>
                              <span className="text-[11px] text-slate-400">Stock: {p.stock}</span>
                            </div>
                          </div>
                          <p className="text-sm font-bold text-emerald-700 shrink-0">Rs {p.price.toLocaleString()}</p>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Quick links */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {[
                { label:"Manage Products", icon: HiOutlineSquares2X2, to: "/farmer/myProducts", color: "emerald" },
                { label:"View Orders",     icon: HiOutlineChartBar,   to: "/farmer/orders",     color: "blue"    },
                { label:"Analytics",       icon: HiOutlineSparkles,   view:"analytics" as ActiveView, color:"violet"  },
              ].map(({ label, icon: Icon, to, view, color }) => (
                <button key={label}
                  onClick={() => view ? setActiveView(view) : navigate(to!)}
                  className={`flex items-center gap-3 rounded-2xl border border-${color}-100 bg-${color}-50/50 px-5 py-4 text-left transition hover:bg-${color}-50 hover:shadow-sm`}>
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-${color}-100`}>
                    <Icon size={18} className={`text-${color}-600`} />
                  </div>
                  <span className="text-sm font-semibold text-slate-700">{label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

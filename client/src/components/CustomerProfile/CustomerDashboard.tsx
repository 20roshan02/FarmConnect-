/**
 * CustomerDashboard.tsx  — Modern customer workspace
 * Sidebar is shared via CustomerSideBar component.
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useSelector } from "react-redux";
import { HiOutlineMenu, HiX } from "react-icons/hi";
import {
  FiArrowRight, FiSettings, FiShoppingBag, FiShoppingCart,
  FiUser, FiPackage,
} from "react-icons/fi";
import { HiOutlineSparkles } from "react-icons/hi2";
import { CustomerSideBar } from "..";
import RecommendedForYou from "../RecommendedForYou";
import type { RootState } from "../../utils/store";

const CustomerDashboard = () => {
  const navigate  = useNavigate();
  const storeUser = useSelector((state: RootState) => state.user.user);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // fallback: also read from localStorage in case store hasn't rehydrated yet
  const [user, setUser] = useState<any>(storeUser);

  useEffect(() => {
    if (storeUser) { setUser(storeUser); return; }
    const raw = localStorage.getItem("user");
    if (!raw) { navigate("/login"); return; }
    try {
      const parsed = JSON.parse(raw);
      if (parsed.role !== "customer") { navigate("/"); return; }
      setUser(parsed);
    } catch { navigate("/login"); }
  }, [storeUser, navigate]);

  const initials = (name = "") =>
    name.split(" ").filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join("");

  const quickActions = [
    { title: "Marketplace",  desc: "Discover fresh produce and new offers.",        icon: FiShoppingBag, to: "/",                  gradient: "from-amber-400 to-orange-500" },
    { title: "My Profile",   desc: "View and update your profile details.",          icon: FiUser,        to: "/customer-profile",   gradient: "from-sky-400 to-blue-500"    },
    { title: "My Orders",    desc: "Track and review your order history.",           icon: FiPackage,     to: "/orders",             gradient: "from-emerald-400 to-teal-500" },
    { title: "Cart",         desc: "Review items and complete checkout faster.",     icon: FiShoppingCart,to: "/cart",               gradient: "from-violet-400 to-purple-500"},
    { title: "Settings",     desc: "Manage account preferences and security.",      icon: FiSettings,    to: "/customer-setting",   gradient: "from-rose-400 to-pink-500"   },
  ];

  return (
    <div className="min-h-screen flex bg-slate-50">

      {/* ── Mobile top bar ──────────────────────────────────────────────── */}
      <div className="fixed inset-x-0 top-0 z-30 flex items-center justify-between border-b border-white/70 bg-white/90 px-4 py-3 backdrop-blur-md md:hidden">
        <span className="font-bold text-slate-800">My Account</span>
        <button onClick={() => setMobileMenuOpen(true)}
          className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50">
          <HiOutlineMenu size={20} />
        </button>
      </div>

      {/* ── Mobile sidebar drawer ───────────────────────────────────────── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="flex h-full w-72 flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <span className="font-bold text-slate-800">Menu</span>
              <button onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100">
                <HiX size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <CustomerSideBar />
            </div>
          </div>
          <div className="flex-1 bg-black/40" onClick={() => setMobileMenuOpen(false)} />
        </div>
      )}

      {/* ── Desktop sidebar ─────────────────────────────────────────────── */}
      <CustomerSideBar />

      {/* ── Main content ────────────────────────────────────────────────── */}
      <main className="mt-14 flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 md:mt-0">

        {/* Hero banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 p-6 sm:p-8 shadow-xl">
          {/* decorative circles */}
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-amber-400/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-violet-500/10 blur-3xl" />

          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-xl font-bold text-white shadow-lg select-none">
                {initials(user?.name || "C")}
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-400/80">
                  Customer Workspace
                </p>
                <h1 className="mt-0.5 text-2xl font-bold text-white">
                  Welcome back, {user?.name?.split(" ")[0] || "there"} 👋
                </h1>
                <p className="mt-0.5 text-sm text-slate-400">{user?.email}</p>
              </div>
            </div>
            <button onClick={() => navigate("/")}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white/10 px-5 py-2.5 text-sm font-semibold text-white ring-1 ring-white/20 transition hover:bg-white/20">
              Continue Shopping
              <FiArrowRight size={15} />
            </button>
          </div>

          {/* Stat pills */}
          <div className="relative mt-6 grid grid-cols-3 gap-3">
            {[
              { label: "Account Type", value: "Customer" },
              { label: "Session",      value: "Active"   },
              { label: "Email",        value: user?.email || "—", mono: true },
            ].map(({ label, value, mono }) => (
              <div key={label} className="rounded-xl bg-white/8 border border-white/10 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
                <p className={`mt-0.5 truncate text-sm font-semibold text-white ${mono ? "font-mono text-xs" : ""}`}>
                  {value}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Quick actions grid */}
        <div className="mt-6">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">Quick Actions</p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
            {quickActions.map(({ title, desc, icon: Icon, to, gradient }) => (
              <button key={title} onClick={() => navigate(to)}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                <div className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white shadow-md`}>
                  <Icon size={20} />
                </div>
                <p className="font-semibold text-slate-900">{title}</p>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">{desc}</p>
                <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-slate-700">
                  Open <FiArrowRight size={12} className="transition group-hover:translate-x-1" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Recommendations */}
        <div className="mt-8">
          <p className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-400">
            <HiOutlineSparkles size={13} className="text-amber-500" />
            Recommended For You
          </p>
          <RecommendedForYou topN={10} variant="section" />
        </div>
      </main>
    </div>
  );
};

export default CustomerDashboard;

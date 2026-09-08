/**
 * CustomerSideBar.tsx — Modern sticky sidebar for all customer pages.
 * Active route is highlighted automatically via useLocation.
 */

import { useNavigate, useLocation } from "react-router";
import { useSelector } from "react-redux";
import {
  HiOutlineHome, HiOutlineShoppingBag, HiOutlineShoppingCart,
  HiOutlineUser, HiOutlineCog6Tooth, HiOutlineSparkles,
} from "react-icons/hi2";
import { HiOutlineArchive as HiOutlinePackage } from "react-icons/hi";
import type { RootState } from "../utils/store";

const NAV_ITEMS = [
  { label: "Dashboard", path: "/customerDashboard", icon: HiOutlineHome       },
  { label: "My Orders",  path: "/orders",            icon: HiOutlinePackage    },
  { label: "Profile",    path: "/customer-profile",  icon: HiOutlineUser       },
  { label: "Cart",       path: "/cart",              icon: HiOutlineShoppingCart },
  { label: "Marketplace",path: "/",                  icon: HiOutlineShoppingBag },
  { label: "Settings",   path: "/customer-setting",  icon: HiOutlineCog6Tooth  },
];

function initials(name = "") {
  return name.split(" ").filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join("");
}

const CustomerSideBar = () => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const user      = useSelector((state: RootState) => state.user.user);

  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-slate-200 bg-white min-h-screen sticky top-0">

      {/* Brand */}
      <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-sm">
          <HiOutlineSparkles className="text-white" size={18} />
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">FarmConnect</p>
          <p className="text-sm font-bold text-slate-800">My Account</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {NAV_ITEMS.map(({ label, path, icon: Icon }) => {
          const active = location.pathname === path ||
            (path === "/customerDashboard" && location.pathname === "/customerDashboard");
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all
                ${active
                  ? "bg-amber-50 text-amber-700 font-semibold shadow-[inset_3px_0_0_#f59e0b]"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
            >
              <Icon size={17} className={active ? "text-amber-600" : "text-slate-400 group-hover:text-slate-600"} />
              {label}
            </button>
          );
        })}
      </nav>

      {/* User card */}
      {user && (
        <div className="border-t border-slate-100 px-4 py-4">
          <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 text-xs font-bold text-white select-none">
              {initials(user.name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-slate-800">{user.name}</p>
              <p className="truncate text-[11px] text-slate-400">{user.email}</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};

export default CustomerSideBar;

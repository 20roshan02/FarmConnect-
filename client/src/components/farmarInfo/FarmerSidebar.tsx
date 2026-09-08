/**
 * FarmerSidebar.tsx
 * Shared sticky sidebar for all farmer pages.
 * Active route highlighted automatically via useLocation.
 */
import { useNavigate, useLocation } from "react-router";
import { useSelector } from "react-redux";
import {
  HiOutlineHome, HiOutlineSquares2X2, HiOutlineShoppingBag,
  HiOutlineCog6Tooth, HiOutlineChartBar, HiOutlineSparkles,
  HiOutlineGlobeAlt,
} from "react-icons/hi2";
import type { RootState } from "../../utils/store";

const NAV = [
  { label: "Dashboard", path: "/farmerDashboard",       icon: HiOutlineHome         },
  { label: "Products",  path: "/farmer/myProducts",     icon: HiOutlineSquares2X2   },
  { label: "Orders",    path: "/farmer/orders",         icon: HiOutlineShoppingBag  },
  { label: "Analytics", path: "/farmer/analytics",     icon: HiOutlineChartBar     },
  { label: "ML Insights",path: "/farmer/ml",           icon: HiOutlineSparkles     },
  { label: "Settings",  path: "/farmer/farmerSetting",  icon: HiOutlineCog6Tooth    },
];

function initials(name = "") {
  return name.split(" ").filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join("");
}

export default function FarmerSidebar() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const user      = useSelector((state: RootState) => state.user.user);

  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col bg-[#0f1f17] min-h-screen sticky top-0">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/8">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 shadow-md">
          <HiOutlineGlobeAlt className="text-white" size={18} />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400/70">FarmConnect</p>
          <p className="text-sm font-bold text-white">Farmer Panel</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ label, path, icon: Icon }) => {
          const active = location.pathname === path;
          return (
            <button key={path} onClick={() => navigate(path)}
              className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all
                ${active
                  ? "bg-emerald-500/20 text-emerald-300 shadow-[inset_3px_0_0_#34d399]"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}>
              <Icon size={17} className={active ? "text-emerald-400" : "text-slate-500 group-hover:text-slate-300"} />
              {label}
            </button>
          );
        })}
      </nav>

      {/* User card */}
      {user && (
        <div className="border-t border-white/8 px-4 py-4">
          <div className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 text-xs font-bold text-white select-none">
              {initials(user.name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-white">{user.name}</p>
              <p className="truncate text-[11px] text-slate-400">{user.email}</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

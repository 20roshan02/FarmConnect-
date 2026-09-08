/**
 * CustomerSetting.tsx — Modern settings page
 * Sections: Update Profile · Change Password · Account Danger Zone
 */

import { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { useNavigate } from "react-router";
import { useSelector, useDispatch } from "react-redux";
import { HiOutlineMenu, HiX } from "react-icons/hi";
import {
  HiOutlineUser, HiOutlineLockClosed, HiOutlineTrash,
  HiOutlineArrowRightOnRectangle, HiOutlineCheckCircle,
  HiOutlineEye, HiOutlineEyeSlash, HiOutlineShieldCheck,
  HiOutlineExclamationTriangle,
} from "react-icons/hi2";
import type { RootState } from "../../utils/store";
import { logout as logoutAction, updateUser } from "../../utils/userSlice";
import { setCart } from "../../utils/cartSlice";
import { CustomerSideBar } from "..";

// ─── Shared field primitives ──────────────────────────────────────────────────
const inputCls = (err?: boolean) =>
  `w-full rounded-xl border px-4 py-2.5 text-sm text-slate-800 outline-none transition
   focus:ring-2 focus:ring-amber-400 placeholder:text-slate-300
   ${err ? "border-red-400 bg-red-50" : "border-slate-200 bg-white focus:border-amber-400"}`;

function PasswordInput({
  value, onChange, placeholder, autoComplete,
}: { value: string; onChange: (v: string) => void; placeholder: string; autoComplete?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={inputCls() + " pr-11"}
      />
      <button type="button" onClick={() => setShow(s => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
        aria-label={show ? "Hide password" : "Show password"}>
        {show ? <HiOutlineEyeSlash size={18} /> : <HiOutlineEye size={18} />}
      </button>
    </div>
  );
}

function SectionCard({ icon: Icon, title, subtitle, children, accent = "amber" }: {
  icon: any; title: string; subtitle: string; children: React.ReactNode; accent?: "amber" | "blue" | "red";
}) {
  const colors = {
    amber: "from-amber-400 to-orange-400 border-amber-100",
    blue:  "from-blue-400 to-indigo-400 border-blue-100",
    red:   "from-rose-400 to-red-500 border-red-100",
  };
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-4 border-b border-slate-100 bg-slate-50/50 px-6 py-4">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${colors[accent].split(" ")[0]} ${colors[accent].split(" ")[1]} text-white shadow-sm`}>
          <Icon size={18} />
        </div>
        <div>
          <h2 className="font-bold text-slate-900">{title}</h2>
          <p className="text-[12px] text-slate-500">{subtitle}</p>
        </div>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const CustomerSettings = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user     = useSelector((state: RootState) => state.user.user);

  const [mobileOpen, setMobileOpen] = useState(false);

  // Profile form
  const [name,  setName]  = useState(user?.name  || "");
  const [email, setEmail] = useState(user?.email || "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileErrors, setProfileErrors] = useState<{ name?: string; email?: string }>({});

  // Password form
  const [currentPw,  setCurrentPw]  = useState("");
  const [newPw,      setNewPw]      = useState("");
  const [confirmPw,  setConfirmPw]  = useState("");
  const [savingPw,   setSavingPw]   = useState(false);
  const [pwStrength, setPwStrength] = useState(0);

  // Danger zone
  const [showDelete,  setShowDelete]  = useState(false);
  const [deleting,    setDeleting]    = useState(false);
  const [deleteInput, setDeleteInput] = useState("");

  const token = () => localStorage.getItem("token");

  // ── Password strength ──────────────────────────────────────────────────────
  const calcStrength = (pw: string) => {
    let s = 0;
    if (pw.length >= 8) s++;
    if (/[A-Z]/.test(pw)) s++;
    if (/[0-9]/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    return s;
  };

  const STRENGTH_LABEL = ["", "Weak", "Fair", "Good", "Strong"];
  const STRENGTH_COLOR = ["", "bg-red-400", "bg-amber-400", "bg-blue-400", "bg-green-500"];

  // ── Update profile ─────────────────────────────────────────────────────────
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: typeof profileErrors = {};
    if (!name.trim())  errs.name  = "Name is required";
    if (!email.trim()) errs.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(email)) errs.email = "Enter a valid email";
    if (Object.keys(errs).length) { setProfileErrors(errs); return; }

    const t = token(); if (!t) { toast.error("Please login again"); return; }
    try {
      setSavingProfile(true);
      const res = await axios.put(
        `${import.meta.env.VITE_API_URL}/user/profile`,
        { name: name.trim(), email: email.trim() },
        { headers: { Authorization: `Bearer ${t}` } }
      );
      const updated = res.data?.user ?? { name: name.trim(), email: email.trim() };
      dispatch(updateUser(updated));
      toast.success("Profile updated successfully ✅");
      setProfileErrors({});
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  // ── Change password ────────────────────────────────────────────────────────
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw !== confirmPw) { toast.error("Passwords do not match"); return; }
    if (newPw.length < 8)    { toast.error("Password must be at least 8 characters"); return; }
    const t = token(); if (!t) { toast.error("Please login again"); return; }
    try {
      setSavingPw(true);
      await axios.put(
        `${import.meta.env.VITE_API_URL}/user/change-password`,
        { currentPassword: currentPw, newPassword: newPw },
        { headers: { Authorization: `Bearer ${t}` } }
      );
      toast.success("Password updated ✅");
      setCurrentPw(""); setNewPw(""); setConfirmPw(""); setPwStrength(0);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update password");
    } finally {
      setSavingPw(false);
    }
  };

  // ── Logout ─────────────────────────────────────────────────────────────────
  const handleLogout = () => {
    localStorage.removeItem("user"); localStorage.removeItem("token");
    dispatch(logoutAction()); dispatch(setCart([]));
    navigate("/login");
  };

  // ── Delete account ─────────────────────────────────────────────────────────
  const handleDeleteAccount = async () => {
    const t = token(); if (!t) { toast.error("Please login again"); return; }
    try {
      setDeleting(true);
      await axios.delete(`${import.meta.env.VITE_API_URL}/user`, { headers: { Authorization: `Bearer ${t}` } });
      toast.success("Account deleted");
      localStorage.removeItem("user"); localStorage.removeItem("token");
      dispatch(logoutAction()); dispatch(setCart([]));
      navigate("/login");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to delete account");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50">

      {/* Mobile bar */}
      <div className="fixed inset-x-0 top-0 z-30 flex items-center justify-between border-b bg-white/90 px-4 py-3 backdrop-blur-md md:hidden">
        <span className="font-bold text-slate-800">Settings</span>
        <button onClick={() => setMobileOpen(true)} className="rounded-xl border border-slate-200 p-2 text-slate-600">
          <HiOutlineMenu size={20} />
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="flex h-full w-72 flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <span className="font-bold text-slate-800">Menu</span>
              <button onClick={() => setMobileOpen(false)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100">
                <HiX size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4"><CustomerSideBar /></div>
          </div>
          <div className="flex-1 bg-black/40" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      <CustomerSideBar />

      <main className="mt-14 flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 md:mt-0">
        <div className="mx-auto max-w-2xl space-y-6">

          {/* Page heading */}
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Account Settings</h1>
            <p className="mt-1 text-sm text-slate-500">Manage your profile, security and account preferences.</p>
          </div>

          {/* ── 1. Update Profile ──────────────────────────────────────── */}
          <SectionCard icon={HiOutlineUser} accent="amber"
            title="Profile Information"
            subtitle="Update your name and email address">
            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wide text-slate-500">
                    Full Name <span className="text-red-400">*</span>
                  </label>
                  <input value={name} onChange={e => { setName(e.target.value); setProfileErrors(p => ({ ...p, name: undefined })); }}
                    placeholder="Ram Bahadur Thapa" className={inputCls(!!profileErrors.name)} autoComplete="name" />
                  {profileErrors.name && <p className="mt-1 text-[11px] text-red-500">{profileErrors.name}</p>}
                </div>
                <div>
                  <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wide text-slate-500">
                    Email <span className="text-red-400">*</span>
                  </label>
                  <input type="email" value={email} onChange={e => { setEmail(e.target.value); setProfileErrors(p => ({ ...p, email: undefined })); }}
                    placeholder="you@example.com" className={inputCls(!!profileErrors.email)} autoComplete="email" />
                  {profileErrors.email && <p className="mt-1 text-[11px] text-red-500">{profileErrors.email}</p>}
                </div>
              </div>
              <div className="flex justify-end">
                <button type="submit" disabled={savingProfile}
                  className="flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-amber-600 disabled:opacity-60">
                  {savingProfile
                    ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />Saving…</>
                    : <><HiOutlineCheckCircle size={16} />Save Changes</>}
                </button>
              </div>
            </form>
          </SectionCard>

          {/* ── 2. Change Password ─────────────────────────────────────── */}
          <SectionCard icon={HiOutlineLockClosed} accent="blue"
            title="Change Password"
            subtitle="Use a strong, unique password">
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wide text-slate-500">Current Password</label>
                <PasswordInput value={currentPw} onChange={setCurrentPw} placeholder="Current password" autoComplete="current-password" />
              </div>
              <div>
                <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wide text-slate-500">New Password</label>
                <PasswordInput value={newPw} onChange={v => { setNewPw(v); setPwStrength(calcStrength(v)); }} placeholder="New password (min 8 chars)" autoComplete="new-password" />
                {/* Strength meter */}
                {newPw.length > 0 && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex flex-1 gap-1">
                      {[1,2,3,4].map(i => (
                        <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i <= pwStrength ? STRENGTH_COLOR[pwStrength] : "bg-slate-100"}`} />
                      ))}
                    </div>
                    <span className={`text-[11px] font-semibold ${pwStrength <= 1 ? "text-red-500" : pwStrength <= 2 ? "text-amber-500" : pwStrength <= 3 ? "text-blue-500" : "text-green-600"}`}>
                      {STRENGTH_LABEL[pwStrength]}
                    </span>
                  </div>
                )}
              </div>
              <div>
                <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wide text-slate-500">Confirm New Password</label>
                <PasswordInput value={confirmPw} onChange={setConfirmPw} placeholder="Confirm new password" autoComplete="new-password" />
                {confirmPw.length > 0 && newPw !== confirmPw && (
                  <p className="mt-1 text-[11px] text-red-500">Passwords do not match</p>
                )}
                {confirmPw.length > 0 && newPw === confirmPw && newPw.length > 0 && (
                  <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-green-600">
                    <HiOutlineCheckCircle size={13} /> Passwords match
                  </p>
                )}
              </div>
              <div className="flex justify-end">
                <button type="submit" disabled={savingPw}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60">
                  {savingPw
                    ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />Updating…</>
                    : <><HiOutlineShieldCheck size={16} />Update Password</>}
                </button>
              </div>
            </form>
          </SectionCard>

          {/* ── 3. Account Actions ─────────────────────────────────────── */}
          <SectionCard icon={HiOutlineExclamationTriangle} accent="red"
            title="Account"
            subtitle="Logout or permanently delete your account">
            <div className="space-y-4">

              {/* Logout */}
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-5 py-4">
                <div>
                  <p className="font-semibold text-slate-800">Sign Out</p>
                  <p className="text-xs text-slate-500">End your current session</p>
                </div>
                <button onClick={handleLogout}
                  className="flex items-center gap-2 rounded-xl border border-amber-200 bg-white px-4 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-50">
                  <HiOutlineArrowRightOnRectangle size={16} />
                  Logout
                </button>
              </div>

              {/* Delete account */}
              <div className={`rounded-xl border ${showDelete ? "border-red-300 bg-red-50" : "border-slate-200 bg-slate-50"} px-5 py-4 transition-all`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-800">Delete Account</p>
                    <p className="text-xs text-slate-500">Permanently remove your account and all data</p>
                  </div>
                  {!showDelete && (
                    <button onClick={() => setShowDelete(true)}
                      className="flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50">
                      <HiOutlineTrash size={15} />
                      Delete
                    </button>
                  )}
                </div>

                {showDelete && (
                  <div className="mt-4 space-y-3">
                    <p className="text-sm text-red-700 leading-relaxed">
                      This will <strong>permanently delete</strong> your account and all order history.
                      This action cannot be undone.
                    </p>
                    <div>
                      <label className="mb-1 block text-[12px] font-semibold text-red-600">
                        Type <span className="font-mono bg-red-100 px-1 rounded">DELETE</span> to confirm
                      </label>
                      <input
                        value={deleteInput}
                        onChange={e => setDeleteInput(e.target.value)}
                        placeholder="DELETE"
                        className="w-full rounded-xl border border-red-300 bg-white px-4 py-2.5 text-sm font-mono text-red-800 outline-none focus:ring-2 focus:ring-red-400"
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={handleDeleteAccount}
                        disabled={deleting || deleteInput !== "DELETE"}
                        className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed">
                        {deleting
                          ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />Deleting…</>
                          : <><HiOutlineTrash size={15} />Yes, delete my account</>}
                      </button>
                      <button onClick={() => { setShowDelete(false); setDeleteInput(""); }}
                        className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </SectionCard>

        </div>
      </main>
    </div>
  );
};

export default CustomerSettings;

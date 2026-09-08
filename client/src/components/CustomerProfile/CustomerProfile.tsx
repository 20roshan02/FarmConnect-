/**
 * CustomerProfile.tsx
 * View profile + inline edit form.
 * Edit Profile button toggles an in-page edit panel — no separate route needed.
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useSelector, useDispatch } from "react-redux";
import axios from "axios";
import toast from "react-hot-toast";
import { HiOutlineMenu, HiX } from "react-icons/hi";
import {
  HiOutlinePencilSquare, HiOutlineXMark, HiOutlineCheckCircle,
  HiOutlineUser, HiOutlineEnvelope, HiOutlinePhone,
  HiOutlineMapPin, HiOutlineIdentification, HiOutlineCalendar,
} from "react-icons/hi2";
import { MdVerified } from "react-icons/md";
import { CustomerSideBar } from "..";
import { updateUser } from "../../utils/userSlice";
import type { RootState } from "../../utils/store";

// ─── Types ────────────────────────────────────────────────────────────────────
interface EditForm {
  name: string;
  email: string;
  phone: string;
  street: string;
  city: string;
  district: string;
}

// ─── Helper ───────────────────────────────────────────────────────────────────
function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4">
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
        <Icon size={17} className="text-slate-500" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
        <p className={`mt-0.5 text-sm font-semibold leading-snug ${value === "Not set" ? "text-slate-300 italic" : "text-slate-800"}`}>
          {value}
        </p>
      </div>
    </div>
  );
}

const inputCls = (err?: boolean) =>
  `w-full rounded-xl border px-4 py-2.5 text-sm text-slate-800 outline-none transition
   focus:ring-2 focus:ring-amber-400 placeholder:text-slate-300
   ${err ? "border-red-400 bg-red-50" : "border-slate-200 bg-white focus:border-amber-400"}`;

// ─── Main ─────────────────────────────────────────────────────────────────────
const CustomerProfile = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const storeUser = useSelector((state: RootState) => state.user.user);

  const [user, setUser]     = useState<any>(storeUser);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving]  = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const [form, setForm] = useState<EditForm>({
    name: "", email: "", phone: "", street: "", city: "", district: "",
  });
  const [errors, setErrors] = useState<Partial<EditForm>>({});

  useEffect(() => {
    const src = storeUser ?? (() => { try { return JSON.parse(localStorage.getItem("user") || "null"); } catch { return null; } })();
    if (!src) { navigate("/login"); return; }
    if (src.role !== "customer") { navigate("/"); return; }
    setUser(src);
  }, [storeUser, navigate]);

  const openEdit = () => {
    setForm({
      name:     user?.name     || "",
      email:    user?.email    || "",
      phone:    user?.phone    || "",
      street:   user?.address?.street   || "",
      city:     user?.address?.city     || "",
      district: user?.address?.district || "",
    });
    setErrors({});
    setEditing(true);
  };

  const set = (f: keyof EditForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(p => ({ ...p, [f]: e.target.value }));
    if (errors[f]) setErrors(p => ({ ...p, [f]: undefined }));
  };

  const validate = () => {
    const e: Partial<EditForm> = {};
    if (!form.name.trim())  e.name  = "Name is required";
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Enter a valid email";
    return e;
  };

  const handleSave = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    const token = localStorage.getItem("token");
    if (!token) { toast.error("Please login again"); return; }

    try {
      setSaving(true);
      const res = await axios.put(
        `${import.meta.env.VITE_API_URL}/user/profile`,
        { name: form.name.trim(), email: form.email.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const updated = res.data?.user ?? { name: form.name.trim(), email: form.email.trim() };
      dispatch(updateUser(updated));
      setUser((prev: any) => ({ ...prev, ...updated }));
      toast.success("Profile updated ✅");
      setEditing(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const initials = (name = "") =>
    name.split(" ").filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join("");

  const joinedDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-NP", { year: "numeric", month: "long", day: "numeric" })
    : null;

  return (
    <div className="min-h-screen flex bg-slate-50">

      {/* Mobile bar */}
      <div className="fixed inset-x-0 top-0 z-30 flex items-center justify-between border-b bg-white/90 px-4 py-3 backdrop-blur-md md:hidden">
        <span className="font-bold text-slate-800">My Profile</span>
        <button onClick={() => setMobileOpen(true)}
          className="rounded-xl border border-slate-200 p-2 text-slate-600">
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
        <div className="mx-auto max-w-2xl space-y-5">

          {/* ── Profile card ───────────────────────────────────────────── */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

            {/* Cover banner */}
            <div className="relative h-28 bg-gradient-to-br from-amber-400 via-orange-400 to-rose-400">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.07%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-30" />
            </div>

            <div className="px-6 pb-6">
              {/* Avatar row */}
              <div className="flex items-end justify-between">
                <div className="-mt-10 flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-white bg-gradient-to-br from-amber-400 to-orange-500 text-2xl font-bold text-white shadow-lg select-none">
                  {initials(user?.name || "C")}
                </div>
                <button
                  onClick={editing ? () => setEditing(false) : openEdit}
                  className={`mt-2 flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                    editing
                      ? "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      : "bg-amber-500 text-white hover:bg-amber-600 shadow-sm"
                  }`}
                >
                  {editing
                    ? <><HiOutlineXMark size={15} />Cancel</>
                    : <><HiOutlinePencilSquare size={15} />Edit Profile</>
                  }
                </button>
              </div>

              {/* Name + verified badge */}
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-slate-900">{user?.name}</h1>
                <span className="flex items-center gap-1 rounded-full border border-green-100 bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                  <MdVerified size={12} /> Verified Customer
                </span>
              </div>
              <p className="mt-0.5 text-sm text-slate-500">{user?.email}</p>
            </div>
          </div>

          {/* ── View mode ──────────────────────────────────────────────── */}
          {!editing && (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 space-y-3">
              <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-400">
                <HiOutlineUser size={14} /> Personal Details
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <InfoRow icon={HiOutlineIdentification} label="Full Name"  value={user?.name  || "Not set"} />
                <InfoRow icon={HiOutlineEnvelope}       label="Email"      value={user?.email || "Not set"} />
                <InfoRow icon={HiOutlinePhone}          label="Phone"      value={user?.phone || "Not set"} />
                {joinedDate && (
                  <InfoRow icon={HiOutlineCalendar} label="Member Since" value={joinedDate} />
                )}
                <div className="sm:col-span-2">
                  <InfoRow
                    icon={HiOutlineMapPin}
                    label="Delivery Address"
                    value={
                      user?.address
                        ? typeof user.address === "string"
                          ? user.address
                          : [user.address.street, user.address.city, user.address.district]
                              .filter(Boolean).join(", ") || "Not set"
                        : "Not set"
                    }
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => navigate("/customer-setting")}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  <HiOutlineIdentification size={15} />
                  Change Password & Account Settings
                </button>
              </div>
            </div>
          )}

          {/* ── Edit mode ──────────────────────────────────────────────── */}
          {editing && (
            <form onSubmit={handleSave}
              className="rounded-2xl border border-amber-200 bg-white shadow-sm overflow-hidden">

              <div className="border-b border-slate-100 bg-amber-50/50 px-6 py-4 flex items-center gap-2">
                <HiOutlinePencilSquare size={16} className="text-amber-600" />
                <h2 className="font-bold text-slate-800">Edit Profile</h2>
                <span className="ml-auto text-xs text-slate-400">Fields marked * are required</span>
              </div>

              <div className="p-6 space-y-5">

                {/* Name + Email */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wide text-slate-500">
                      Full Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      value={form.name} onChange={set("name")}
                      placeholder="Ram Bahadur Thapa"
                      className={inputCls(!!errors.name)}
                      autoComplete="name"
                    />
                    {errors.name && <p className="mt-1 text-[11px] text-red-500">{errors.name}</p>}
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wide text-slate-500">
                      Email <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="email" value={form.email} onChange={set("email")}
                      placeholder="you@example.com"
                      className={inputCls(!!errors.email)}
                      autoComplete="email"
                    />
                    {errors.email && <p className="mt-1 text-[11px] text-red-500">{errors.email}</p>}
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wide text-slate-500">
                    Phone Number
                  </label>
                  <input
                    type="tel" value={form.phone} onChange={set("phone")}
                    placeholder="9841234567"
                    className={inputCls()}
                    autoComplete="tel"
                  />
                </div>

                {/* Address */}
                <div>
                  <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wide text-slate-500">
                    Delivery Address
                  </label>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <input value={form.street}   onChange={set("street")}   placeholder="Street / Tole" className={inputCls()} />
                    <input value={form.city}     onChange={set("city")}     placeholder="City"          className={inputCls()} />
                    <input value={form.district} onChange={set("district")} placeholder="District"      className={inputCls()} />
                  </div>
                </div>

                {/* Note: phone/address are stored client-side only for display — server only persists name+email */}
                <p className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-[12px] text-blue-600">
                  Phone and address are saved locally for pre-filling delivery forms. Name and email are updated on the server.
                </p>

              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-4">
                <button type="button" onClick={() => setEditing(false)}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-amber-600 disabled:opacity-60 disabled:cursor-not-allowed">
                  {saving ? (
                    <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />Saving…</>
                  ) : (
                    <><HiOutlineCheckCircle size={16} />Save Changes</>
                  )}
                </button>
              </div>
            </form>
          )}

        </div>
      </main>
    </div>
  );
};

export default CustomerProfile;

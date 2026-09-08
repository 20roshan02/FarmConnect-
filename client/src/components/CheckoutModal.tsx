/**
 * CheckoutModal.tsx
 *
 * A two-step modal that sits between "Buy Now / Proceed to Payment" and
 * the Khalti redirect.
 *
 * Step 1 — Delivery details form
 *   Full name · Phone number · Street address · City · District · ZIP · Delivery notes
 *
 * Step 2 — Order summary review
 *   Shows the items + totals + filled address before the user confirms.
 *
 * On confirm:
 *   • Calls POST /api/v1/order  (buy-now)  OR  POST /api/v1/order/cart  (cart checkout)
 *   • On success → window.location.assign(paymentUrl) to redirect to Khalti
 *
 * Props
 *   mode        "buynow" | "cart"
 *   product     required when mode="buynow"  { _id, title, price, unit, images }
 *   quantity    required when mode="buynow"
 *   cartTotal   required when mode="cart"
 *   cartItemCount required when mode="cart"
 *   token       JWT token for Authorization header
 *   onClose     () => void   — called when user clicks × or outside
 */

import { useState, useEffect, useRef } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import {
  HiOutlineXMark,
  HiOutlineTruck,
  HiOutlineCheckCircle,
  HiOutlineMapPin,
  HiOutlinePhone,
  HiOutlineUser,
  HiChevronRight,
  HiChevronLeft,
} from "react-icons/hi2";
import { MdOutlineInventory2 } from "react-icons/md";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface DeliveryAddress {
  fullName: string;
  phone: string;
  street: string;
  city: string;
  district: string;
  zip: string;
  notes: string;
}

interface ProductMeta {
  _id: string;
  title: string;
  price: number;
  unit?: string;
  images?: string;
}

interface CheckoutModalProps {
  mode: "buynow" | "cart";
  product?: ProductMeta;
  quantity?: number;
  cartTotal?: number;
  cartItemCount?: number;
  token: string;
  onClose: () => void;
}

// Nepal districts list for the dropdown
const NEPAL_DISTRICTS = [
  "Achham","Arghakhanchi","Baglung","Baitadi","Bajhang","Bajura","Banke","Bara",
  "Bardiya","Bhaktapur","Bhojpur","Chitwan","Dadeldhura","Dailekh","Dang","Darchula",
  "Dhading","Dhankuta","Dhanusa","Dolakha","Dolpa","Doti","Eastern Rukum","Gorkha",
  "Gulmi","Humla","Ilam","Jajarkot","Jhapa","Jumla","Kailali","Kalikot","Kanchanpur",
  "Kapilvastu","Kaski","Kathmandu","Kavrepalanchok","Khotang","Lalitpur","Lamjung",
  "Mahottari","Makwanpur","Manang","Morang","Mugu","Mustang","Myagdi","Nawalparasi East",
  "Nawalparasi West","Nuwakot","Okhaldhunga","Palpa","Panchthar","Parbat","Parsa",
  "Pyuthan","Ramechhap","Rasuwa","Rautahat","Rolpa","Rupandehi","Salyan","Sankhuwasabha",
  "Saptari","Sarlahi","Sindhuli","Sindhupalchok","Siraha","Solukhumbu","Sunsari",
  "Surkhet","Syangja","Tanahu","Taplejung","Terhathum","Udayapur","Western Rukum",
].sort();

// ─── Field config ─────────────────────────────────────────────────────────────
const EMPTY_ADDRESS: DeliveryAddress = {
  fullName: "", phone: "", street: "", city: "", district: "", zip: "", notes: "",
};

function validate(addr: DeliveryAddress): Partial<Record<keyof DeliveryAddress, string>> {
  const errs: Partial<Record<keyof DeliveryAddress, string>> = {};
  if (!addr.fullName.trim())  errs.fullName = "Full name is required";
  if (!addr.phone.trim()) {
    errs.phone = "Phone number is required";
  } else if (!/^(\+977[-\s]?)?[0-9]{9,10}$/.test(addr.phone.replace(/\s/g, ""))) {
    errs.phone = "Enter a valid Nepali phone number";
  }
  if (!addr.street.trim())   errs.street   = "Street address is required";
  if (!addr.city.trim())     errs.city     = "City is required";
  if (!addr.district.trim()) errs.district = "District is required";
  if (addr.zip && !/^\d{5}$/.test(addr.zip.trim())) {
    errs.zip = "ZIP must be 5 digits";
  }
  return errs;
}

// ─── Input / Select primitives ────────────────────────────────────────────────
interface FieldProps {
  label: string;
  icon: React.ReactNode;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}
function Field({ label, icon, error, required, children }: FieldProps) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-gray-500">
        {icon}{label}{required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-[11px] text-red-500">{error}</p>}
    </div>
  );
}

const inputCls = (err?: string) =>
  `w-full rounded-xl border px-3.5 py-2.5 text-sm text-gray-800 outline-none transition
   focus:ring-2 focus:ring-green-400 placeholder:text-gray-300
   ${err ? "border-red-400 bg-red-50" : "border-gray-200 bg-white focus:border-green-400"}`;

// ─── Step indicator ───────────────────────────────────────────────────────────
function Steps({ current }: { current: 1 | 2 }) {
  return (
    <div className="flex items-center gap-2 text-[12px] font-semibold">
      {[
        { n: 1, label: "Delivery" },
        { n: 2, label: "Review" },
      ].map(({ n, label }, i) => (
        <div key={n} className="flex items-center gap-2">
          {i > 0 && <HiChevronRight className="text-gray-300" size={14} />}
          <div className={`flex items-center gap-1.5 rounded-full px-3 py-1
            ${current === n
              ? "bg-green-600 text-white"
              : current > n
              ? "bg-green-100 text-green-700"
              : "bg-gray-100 text-gray-400"}`}>
            <span className="flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold">
              {current > n ? "✓" : n}
            </span>
            {label}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function CheckoutModal({
  mode, product, quantity = 1, cartTotal = 0, cartItemCount = 0, token, onClose,
}: CheckoutModalProps) {
  const [step, setStep]       = useState<1 | 2>(1);
  const [addr, setAddr]       = useState<DeliveryAddress>(EMPTY_ADDRESS);
  const [errors, setErrors]   = useState<Partial<Record<keyof DeliveryAddress, string>>>({});
  const [submitting, setSub]  = useState(false);
  const overlayRef            = useRef<HTMLDivElement>(null);

  // Pre-fill name from localStorage user
  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "{}");
      if (u?.name) setAddr(prev => ({ ...prev, fullName: u.name }));
    } catch {}
  }, []);

  // Close on overlay click
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  // Field setter
  const set = (field: keyof DeliveryAddress) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setAddr(prev => ({ ...prev, [field]: e.target.value }));
      if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
    };

  // Step 1 → 2
  const goToReview = () => {
    const errs = validate(addr);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setStep(2);
  };

  // Final submit — call API then redirect
  const handleConfirm = async () => {
    if (submitting) return;
    setSub(true);
    try {
      const deliveryAddress = {
        fullName: addr.fullName.trim(),
        phone:    addr.phone.trim(),
        street:   addr.street.trim(),
        city:     addr.city.trim(),
        district: addr.district.trim(),
        zip:      addr.zip.trim(),
        notes:    addr.notes.trim(),
      };

      let paymentUrl: string;

      if (mode === "buynow" && product) {
        const res = await axios.post(
          `${import.meta.env.VITE_API_URL}/order`,
          { productId: product._id, quantity, deliveryAddress },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        paymentUrl = res.data?.paymentUrl;
      } else {
        const res = await axios.post(
          `${import.meta.env.VITE_API_URL}/order/cart`,
          { deliveryAddress },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        paymentUrl = res.data?.paymentUrl;
      }

      if (!paymentUrl) throw new Error("Payment URL not returned from server");
      window.location.assign(paymentUrl);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to initiate payment. Try again.");
      setSub(false);
    }
  };

  // ── Computed display values ──────────────────────────────────────────────
  const orderTotal = mode === "buynow" && product
    ? product.price * quantity
    : cartTotal;

  const orderLabel = mode === "buynow" && product
    ? `${quantity} × ${product.title}`
    : `${cartItemCount} item${cartItemCount !== 1 ? "s" : ""} from cart`;

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4"
    >
      <div className="relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl
                      max-h-[95vh] flex flex-col overflow-hidden"
           onClick={e => e.stopPropagation()}>

        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-100">
              <HiOutlineTruck className="text-green-700" size={18} />
            </div>
            <div>
              <h2 className="text-[15px] font-bold text-gray-900">
                {step === 1 ? "Delivery Details" : "Review Order"}
              </h2>
              <Steps current={step} />
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            aria-label="Close"
          >
            <HiOutlineXMark size={20} />
          </button>
        </div>

        {/* ── Scrollable body ────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">

          {/* ══ STEP 1 — Delivery form ══════════════════════════════════ */}
          {step === 1 && (
            <>
              {/* Order context pill */}
              <div className="flex items-center gap-3 rounded-xl border border-green-100 bg-green-50 px-4 py-3">
                {mode === "buynow" && product?.images ? (
                  <img src={product.images} alt={product.title}
                    className="h-10 w-10 rounded-lg object-cover shrink-0"
                    onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-200">
                    <MdOutlineInventory2 className="text-green-700" size={18} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] text-green-700 font-semibold truncate">{orderLabel}</p>
                  <p className="text-lg font-extrabold text-green-800">Rs {orderTotal.toLocaleString()}</p>
                </div>
              </div>

              {/* Full name */}
              <Field label="Full Name" icon={<HiOutlineUser size={12} />} error={errors.fullName} required>
                <input
                  type="text" placeholder="e.g. Ram Bahadur Thapa"
                  value={addr.fullName} onChange={set("fullName")}
                  className={inputCls(errors.fullName)}
                  autoComplete="name"
                />
              </Field>

              {/* Phone */}
              <Field label="Phone Number" icon={<HiOutlinePhone size={12} />} error={errors.phone} required>
                <input
                  type="tel" placeholder="e.g. 9841234567"
                  value={addr.phone} onChange={set("phone")}
                  className={inputCls(errors.phone)}
                  autoComplete="tel"
                />
              </Field>

              {/* Street */}
              <Field label="Street / Tole" icon={<HiOutlineMapPin size={12} />} error={errors.street} required>
                <input
                  type="text" placeholder="e.g. Putalisadak, Ward 5"
                  value={addr.street} onChange={set("street")}
                  className={inputCls(errors.street)}
                  autoComplete="street-address"
                />
              </Field>

              {/* City + District side by side */}
              <div className="grid grid-cols-2 gap-3">
                <Field label="City / Municipality" icon={null} error={errors.city} required>
                  <input
                    type="text" placeholder="e.g. Kathmandu"
                    value={addr.city} onChange={set("city")}
                    className={inputCls(errors.city)}
                    autoComplete="address-level2"
                  />
                </Field>
                <Field label="District" icon={null} error={errors.district} required>
                  <select
                    value={addr.district} onChange={set("district")}
                    className={inputCls(errors.district) + " cursor-pointer"}
                  >
                    <option value="">Select…</option>
                    {NEPAL_DISTRICTS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </Field>
              </div>

              {/* ZIP (optional) */}
              <Field label="ZIP Code (optional)" icon={null} error={errors.zip}>
                <input
                  type="text" placeholder="e.g. 44600"
                  value={addr.zip} onChange={set("zip")}
                  className={inputCls(errors.zip)}
                  maxLength={5}
                  autoComplete="postal-code"
                />
              </Field>

              {/* Delivery notes */}
              <Field label="Delivery Notes (optional)" icon={null} error={undefined}>
                <textarea
                  placeholder="Landmark, gate colour, best time to deliver…"
                  value={addr.notes} onChange={set("notes")}
                  rows={2}
                  className={inputCls() + " resize-none"}
                />
              </Field>
            </>
          )}

          {/* ══ STEP 2 — Review ═════════════════════════════════════════ */}
          {step === 2 && (
            <>
              {/* Delivery address summary card */}
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-2">
                <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-gray-400">
                  <HiOutlineTruck size={12} /> Delivering to
                </p>
                <p className="font-bold text-gray-900">{addr.fullName}</p>
                <p className="text-sm text-gray-700">
                  {addr.street}, {addr.city}
                </p>
                <p className="text-sm text-gray-700">
                  {addr.district}{addr.zip ? ` — ${addr.zip}` : ""}
                </p>
                <p className="flex items-center gap-1 text-sm text-gray-700">
                  <HiOutlinePhone size={13} className="text-green-600" />
                  {addr.phone}
                </p>
                {addr.notes && (
                  <p className="mt-1 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 text-[12px] text-amber-700 italic">
                    "{addr.notes}"
                  </p>
                )}
              </div>

              {/* Order summary */}
              <div className="rounded-xl border border-gray-100 bg-white p-4 space-y-3">
                <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 flex items-center gap-1.5">
                  <MdOutlineInventory2 size={12} /> Order Summary
                </p>

                {mode === "buynow" && product && (
                  <div className="flex items-center gap-3">
                    {product.images && (
                      <img src={product.images} alt={product.title}
                        className="h-12 w-12 rounded-lg object-cover shrink-0"
                        onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{product.title}</p>
                      <p className="text-xs text-gray-500">
                        {quantity} {product.unit ?? "unit"}{quantity !== 1 ? "s" : ""} × Rs {product.price.toLocaleString()}
                      </p>
                    </div>
                    <p className="font-bold text-green-700 shrink-0">
                      Rs {orderTotal.toLocaleString()}
                    </p>
                  </div>
                )}

                {mode === "cart" && (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-700">{cartItemCount} cart item{cartItemCount !== 1 ? "s" : ""}</p>
                    <p className="font-bold text-green-700">Rs {cartTotal.toLocaleString()}</p>
                  </div>
                )}

                <div className="border-t border-gray-100 pt-3 flex justify-between font-bold text-base">
                  <span className="text-gray-800">Total payable</span>
                  <span className="text-green-700">Rs {orderTotal.toLocaleString()}</span>
                </div>
              </div>

              {/* Khalti notice */}
              <div className="flex items-start gap-2.5 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-[12px] text-blue-700">
                <HiOutlineCheckCircle size={16} className="mt-0.5 shrink-0 text-blue-500" />
                <p>
                  You'll be redirected to <strong>Khalti</strong> to complete payment securely.
                  Your order will be confirmed once payment succeeds.
                </p>
              </div>
            </>
          )}
        </div>

        {/* ── Footer actions ─────────────────────────────────────────────── */}
        <div className="shrink-0 border-t border-gray-100 px-5 py-4 flex gap-3">
          {step === 1 ? (
            <>
              <button
                onClick={onClose}
                className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={goToReview}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-green-600 py-3 text-sm font-semibold text-white hover:bg-green-700 transition-colors"
              >
                Review Order
                <HiChevronRight size={16} />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setStep(1)}
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                <HiChevronLeft size={16} />
                Edit Details
              </button>
              <button
                onClick={handleConfirm}
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-green-600 py-3 text-sm font-bold text-white hover:bg-green-700 disabled:bg-green-300 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Redirecting…
                  </>
                ) : (
                  <>
                    <HiOutlineTruck size={16} />
                    Confirm & Pay with Khalti
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

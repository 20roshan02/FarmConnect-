/**
 * ProductDescription.tsx
 * Full product detail page — opens when a product card is clicked.
 *
 * Sections:
 *  ① Hero  — large image, title, price, badges, Add-to-cart / Buy-now
 *  ② Details — description, category, unit, stock, location
 *  ③ Farmer card — name, email, member since, products count badge
 *  ④ More from this farmer — horizontal scroll of related products
 */

import { useEffect, useState, useContext } from "react";
import { useParams, useNavigate } from "react-router";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import toast from "react-hot-toast";
import {
  MdLocationPin,
  MdVerified,
  MdOutlineCategory,
  MdOutlineInventory2,
} from "react-icons/md";
import {
  HiOutlineShoppingCart,
  HiOutlineBolt,
  HiArrowLeft,
  HiOutlineUser,
  HiOutlineCalendar,
  HiOutlineScale,
} from "react-icons/hi2";
import { BiSolidCategoryAlt } from "react-icons/bi";
import { addToCart } from "../../utils/cartSlice";
import { CartContext } from "../context/CartContext";
import type { RootState } from "../../utils/store";
import CheckoutModal from "../CheckoutModal";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Farmer {
  _id: string;
  name: string;
  email: string;
  createdAt: string;
  location?: string;
}

interface Product {
  _id: string;
  title: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  location: string;
  images?: string;
  unit?: string;
  rating?: number;
  numReviews?: number;
  createdAt: string;
  farmer: Farmer;
}

interface RelatedProduct {
  _id: string;
  title: string;
  price: number;
  images?: string;
  category: string;
  unit?: string;
  stock: number;
  location: string;
}

// ─── Category colour map ───────────────────────────────────────────────────────
const CAT_COLOR: Record<string, string> = {
  vegetables: "#16a34a",
  fruits:     "#d97706",
  grains:     "#92400e",
  dairy:      "#2563eb",
  other:      "#7c3aed",
};

// ─── Small helpers ────────────────────────────────────────────────────────────
function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span className="inline-block rounded-full px-3 py-1 text-xs font-semibold capitalize"
      style={{ color, backgroundColor: color + "18" }}>
      {label}
    </span>
  );
}

function SkeletonPage() {
  return (
    <div className="min-h-screen bg-gray-50 animate-pulse">
      <div className="max-w-5xl mx-auto px-4 py-8 grid md:grid-cols-2 gap-8">
        <div className="rounded-2xl bg-gray-200 aspect-square" />
        <div className="space-y-4 pt-2">
          <div className="h-6 bg-gray-200 rounded w-3/4" />
          <div className="h-4 bg-gray-100 rounded w-1/2" />
          <div className="h-10 bg-gray-200 rounded-xl w-1/3 mt-4" />
          <div className="h-4 bg-gray-100 rounded w-full mt-6" />
          <div className="h-4 bg-gray-100 rounded w-5/6" />
          <div className="h-4 bg-gray-100 rounded w-4/6" />
          <div className="h-11 bg-gray-200 rounded-xl mt-6" />
        </div>
      </div>
    </div>
  );
}// ─── Main page ────────────────────────────────────────────────────────────────
export default function ProductDescription() {
  const { id } = useParams<{ id: string }>();
  const navigate  = useNavigate();
  const dispatch  = useDispatch();
  const cartCtx   = useContext(CartContext);
  const user      = useSelector((state: RootState) => state.user.user);

  const [product,  setProduct]  = useState<Product | null>(null);
  const [related,  setRelated]  = useState<RelatedProduct[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [qty,      setQty]      = useState(1);
  const [adding,   setAdding]   = useState(false);
  const [imgError, setImgError] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setNotFound(false);
    setImgError(false);
    setQty(1);

    axios
      .get(`${import.meta.env.VITE_API_URL}/product/${id}`)
      .then((res) => {
        setProduct(res.data.product ?? null);
        setRelated(res.data.relatedProducts ?? []);
        if (!res.data.product) setNotFound(true);
      })
      .catch((err) => {
        if (err?.response?.status === 404) setNotFound(true);
        else toast.error("Failed to load product.");
      })
      .finally(() => setLoading(false));
  }, [id]);

  // Scroll to top when product changes
  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, [id]);

  // ── Add to cart ────────────────────────────────────────────────────────────
  const handleAddToCart = async () => {
    if (!user?.token) { toast.error("Please login first"); navigate("/login"); return; }
    if (!product)     return;
    try {
      setAdding(true);
      dispatch(addToCart({ ...product } as any));
      await axios.post(
        `${import.meta.env.VITE_API_URL}/cart/addtoCart`,
        { productId: product._id, quantity: qty },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      await cartCtx?.fetchCart();
      toast.success(`Added ${qty} × ${product.title} to cart 🛒`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to add to cart");
    } finally {
      setAdding(false);
    }
  };

  // ── Buy now — open delivery modal ─────────────────────────────────────────
  const handleBuyNow = () => {
    if (!user?.token) { toast.error("Please login first"); navigate("/login"); return; }
    if (!product)     return;
    setShowCheckout(true);
  };

  // ── States ─────────────────────────────────────────────────────────────────
  if (loading)  return <SkeletonPage />;

  if (notFound || !product) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 px-4">
        <div className="rounded-full bg-red-50 p-6">
          <BiSolidCategoryAlt className="text-5xl text-red-300" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800">Product not found</h1>
        <p className="text-gray-500 text-center max-w-sm">
          This product may have been removed or is no longer available.
        </p>
        <button onClick={() => navigate("/")}
          className="mt-2 bg-green-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-green-700 transition-colors">
          Back to Marketplace
        </button>
      </div>
    );
  }

  const catColor      = CAT_COLOR[product.category] || "#6b7280";
  const isOutOfStock  = product.stock === 0;
  const isLowStock    = !isOutOfStock && product.stock <= 5;
  const maxQty        = Math.min(product.stock, 20);
  const farmerSince   = new Date(product.farmer.createdAt).toLocaleDateString("en-NP", {
    year: "numeric", month: "long",
  });

  return (
    <>
    <div className="min-h-screen bg-gray-50">

      {/* ── Back bar ─────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-green-700 transition-colors"
          >
            <HiArrowLeft size={16} />
            Back
          </button>
          <span className="text-gray-300">/</span>
          <span className="text-sm text-gray-400 capitalize">{product.category}</span>
          <span className="text-gray-300">/</span>
          <span className="text-sm text-gray-800 font-medium truncate max-w-[200px]">{product.title}</span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-10">

        {/* ── ① Hero section ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

          {/* Image panel */}
          <div className="relative bg-gradient-to-br from-green-50 to-emerald-50">
            {product.images && !imgError ? (
              <img
                src={product.images}
                alt={product.title}
                onError={() => setImgError(true)}
                className="w-full h-80 md:h-full object-cover"
                style={{ minHeight: 320 }}
              />
            ) : (
              <div className="w-full h-80 md:h-full flex items-center justify-center"
                style={{ minHeight: 320 }}>
                <BiSolidCategoryAlt className="text-8xl text-green-200" />
              </div>
            )}

            {/* Overlays */}
            {isOutOfStock && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <span className="bg-red-600 text-white font-bold text-lg px-6 py-2 rounded-full">
                  Out of Stock
                </span>
              </div>
            )}
            {isLowStock && (
              <span className="absolute top-4 right-4 bg-orange-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow">
                Only {product.stock} left!
              </span>
            )}
          </div>

          {/* Info panel */}
          <div className="p-6 md:p-8 flex flex-col">
            {/* Category + location badges */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Badge label={product.category} color={catColor} />
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <MdLocationPin className="text-green-500" size={14} />
                {product.location}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 leading-tight mb-2">
              {product.title}
            </h1>

            {/* Price */}
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-3xl font-extrabold text-green-700">
                Rs {product.price.toLocaleString()}
              </span>
              {product.unit && (
                <span className="text-base text-gray-400 font-normal">/ {product.unit}</span>
              )}
            </div>

            {/* Description */}
            <p className="text-gray-600 text-sm leading-relaxed mb-5">
              {product.description}
            </p>

            {/* Meta row */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1 flex items-center gap-1">
                  <MdOutlineInventory2 size={11} /> Stock
                </p>
                <p className={`text-base font-bold ${isOutOfStock ? "text-red-600" : isLowStock ? "text-orange-500" : "text-green-700"}`}>
                  {isOutOfStock ? "Sold out" : `${product.stock} ${product.unit ?? "units"}`}
                </p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1 flex items-center gap-1">
                  <HiOutlineScale size={11} /> Unit
                </p>
                <p className="text-base font-bold text-gray-800 capitalize">{product.unit ?? "kg"}</p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1 flex items-center gap-1">
                  <MdOutlineCategory size={11} /> Category
                </p>
                <p className="text-base font-bold text-gray-800 capitalize">{product.category}</p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1 flex items-center gap-1">
                  <MdLocationPin size={11} /> Location
                </p>
                <p className="text-base font-bold text-gray-800 truncate">{product.location}</p>
              </div>
            </div>

            {/* Quantity selector */}
            {!isOutOfStock && (
              <div className="flex items-center gap-3 mb-5">
                <span className="text-sm font-semibold text-gray-600">Qty:</span>
                <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setQty(q => Math.max(1, q - 1))}
                    className="px-3 py-2 text-gray-600 hover:bg-gray-100 transition-colors font-bold text-lg leading-none"
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>
                  <span className="w-10 text-center text-sm font-bold text-gray-900">{qty}</span>
                  <button
                    onClick={() => setQty(q => Math.min(maxQty, q + 1))}
                    className="px-3 py-2 text-gray-600 hover:bg-gray-100 transition-colors font-bold text-lg leading-none"
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>
                <span className="text-xs text-gray-400">× Rs {product.price} = <strong className="text-green-700">Rs {(product.price * qty).toLocaleString()}</strong></span>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3 mt-auto">
              <button
                onClick={handleAddToCart}
                disabled={isOutOfStock || adding}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gray-900 hover:bg-gray-800
                           disabled:bg-gray-200 disabled:cursor-not-allowed text-white disabled:text-gray-400
                           py-3 font-semibold transition-colors"
              >
                <HiOutlineShoppingCart size={18} />
                {adding ? "Adding…" : "Add to Cart"}
              </button>
              <button
                onClick={handleBuyNow}
                disabled={isOutOfStock}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-green-600 hover:bg-green-700
                           disabled:bg-gray-200 disabled:cursor-not-allowed text-white disabled:text-gray-400
                           py-3 font-semibold transition-colors"
              >
                <HiOutlineBolt size={18} />
                Buy Now
              </button>
            </div>
          </div>
        </div>

        {/* ── ③ Farmer card ────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-green-100">
              <HiOutlineUser className="text-green-700" size={15} />
            </span>
            About the Farmer
          </h2>

          <div className="flex items-start gap-5">
            {/* Avatar */}
            <div className="shrink-0 h-16 w-16 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-600
                            flex items-center justify-center text-white text-2xl font-bold shadow-md select-none">
              {product.farmer.name.charAt(0).toUpperCase()}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xl font-bold text-gray-900">{product.farmer.name}</h3>
                <span className="flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 px-2.5 py-0.5 rounded-full border border-green-100">
                  <MdVerified size={13} />
                  Verified Farmer
                </span>
              </div>

              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Email */}
                <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">Email</p>
                  <p className="text-sm font-semibold text-gray-800 truncate">{product.farmer.email}</p>
                </div>

                {/* Member since */}
                <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1 flex items-center gap-1">
                    <HiOutlineCalendar size={10} /> Member since
                  </p>
                  <p className="text-sm font-semibold text-gray-800">{farmerSince}</p>
                </div>

                {/* Location */}
                {(product.farmer.location || product.location) && (
                  <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1 flex items-center gap-1">
                      <MdLocationPin size={10} /> Location
                    </p>
                    <p className="text-sm font-semibold text-gray-800">
                      {product.farmer.location || product.location}
                    </p>
                  </div>
                )}
              </div>

              {/* Farmer bio placeholder */}
              <p className="mt-3 text-sm text-gray-500 leading-relaxed">
                {product.farmer.name} is a verified FarmConnect farmer providing fresh,
                locally sourced produce directly to customers.
                {related.length > 0 && ` They currently have ${related.length + 1} product${related.length > 0 ? "s" : ""} listed on the marketplace.`}
              </p>
            </div>
          </div>
        </div>

        {/* ── ④ More from this farmer ──────────────────────────────────────── */}
        {related.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-amber-100">
                <BiSolidCategoryAlt className="text-amber-700" size={14} />
              </span>
              More from {product.farmer.name}
            </h2>

            <div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
              {related.map((rp) => {
                const rpCatColor = CAT_COLOR[rp.category] || "#6b7280";
                const rpOOS = rp.stock === 0;
                return (
                  <div
                    key={rp._id}
                    onClick={() => navigate(`/product/${rp._id}`)}
                    className="shrink-0 w-44 rounded-2xl border border-gray-100 bg-white overflow-hidden
                               cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group"
                  >
                    <div className="relative h-32 bg-gray-50 overflow-hidden">
                      {rp.images ? (
                        <img src={rp.images} alt={rp.title}
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                          onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      ) : (
                        <div className="h-full flex items-center justify-center">
                          <BiSolidCategoryAlt className="text-4xl text-green-200" />
                        </div>
                      )}
                      {rpOOS && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <span className="text-white text-[10px] font-bold">Sold Out</span>
                        </div>
                      )}
                      <span className="absolute top-2 left-2 rounded-full px-2 py-0.5 text-[9px] font-bold text-white capitalize"
                        style={{ backgroundColor: rpCatColor + "dd" }}>
                        {rp.category}
                      </span>
                    </div>
                    <div className="p-3">
                      <p className="text-[13px] font-bold text-gray-900 line-clamp-2 leading-tight mb-1">{rp.title}</p>
                      <p className="text-sm font-extrabold text-green-700">
                        Rs {rp.price.toLocaleString()}
                        {rp.unit && <span className="text-[10px] font-normal text-gray-400">/{rp.unit}</span>}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>

    {/* ── Checkout modal ────────────────────────────────────────────────── */}
    {showCheckout && user?.token && product && (
      <CheckoutModal
        mode="buynow"
        product={{
          _id:    product._id,
          title:  product.title,
          price:  product.price,
          unit:   product.unit,
          images: product.images,
        }}
        quantity={qty}
        token={user.token}
        onClose={() => setShowCheckout(false)}
      />
    )}
  </>
  );
}

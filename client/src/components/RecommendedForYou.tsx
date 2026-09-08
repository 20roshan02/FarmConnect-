/**
 * RecommendedForYou.tsx
 * Customer-facing Collaborative Filtering recommendation strip.
 *
 * Features:
 *  - Personalised hybrid CF (user-based + item-based) when user has order history
 *  - Graceful fallback to platform popularity when cold-start
 *  - Category affinity badges showing WHY an item was recommended
 *  - Horizontal scroll carousel with prev/next arrow buttons
 *  - Add-to-cart and Buy-now inline actions
 *  - Hidden entirely if user is not logged in or no recs available
 *  - Compact skeleton loading state
 */

import { useEffect, useRef, useState, useContext } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router";
import axios from "axios";
import toast from "react-hot-toast";
import {
  HiOutlineShoppingCart,
  HiOutlineBolt,
  HiChevronLeft,
  HiChevronRight,
  HiSparkles,
} from "react-icons/hi2";
import { MdLocationPin } from "react-icons/md";
import { fetchMyRecommendations, type Recommendation } from "../services/mlApi";
import { addToCart } from "../utils/cartSlice";
import { CartContext } from "./context/CartContext";
import type { RootState } from "../utils/store";

// ─── Helpers ─────────────────────────────────────────────────────────────────
const METHOD_LABEL: Record<string, string> = {
  hybrid_cf:          "Based on your purchase history",
  collaborative_filtering: "Based on customers like you",
  popularity_fallback: "Most popular on FarmConnect",
  none:               "Popular right now",
};

const CAT_COLORS: Record<string, string> = {
  vegetables: "#16a34a",
  fruits:     "#d97706",
  grains:     "#92400e",
  dairy:      "#2563eb",
  other:      "#7c3aed",
};

// ─── Skeleton card ────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="shrink-0 w-48 rounded-2xl border border-gray-100 overflow-hidden animate-pulse bg-white">
      <div className="h-36 bg-gray-200" />
      <div className="p-3 space-y-2">
        <div className="h-3 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-100 rounded w-1/2" />
        <div className="h-7 bg-gray-200 rounded-lg mt-2" />
      </div>
    </div>
  );
}

// ─── Individual product card ──────────────────────────────────────────────────
interface ProductCardProps {
  rec: Recommendation;
  categoryAffinity: Record<string, number>;
  onAddToCart: (rec: Recommendation) => Promise<void>;
  onBuyNow: (rec: Recommendation) => Promise<void>;
  isAdding: boolean;
  isBuying: boolean;
  onNavigate: (productId: string) => void;
}

function ProductCard({ rec, categoryAffinity, onAddToCart, onBuyNow, isAdding, isBuying, onNavigate }: ProductCardProps) {
  const p = rec.product;
  if (!p) return null;

  const catColor   = CAT_COLORS[p.category] || "#6b7280";
  const affinityPct = categoryAffinity[p.category];
  const isOutOfStock = p.stock === 0;

  return (
    <div className="shrink-0 w-48 rounded-2xl border border-gray-100 bg-white overflow-hidden
                    hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group flex flex-col">
      {/* Image */}
      <div
        className="relative h-36 overflow-hidden bg-gray-50 cursor-pointer"
        onClick={() => onNavigate(rec.productId)}
      >
        {p.images ? (
          <img src={p.images} alt={p.title}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
            <span className="text-4xl">🌿</span>
          </div>
        )}

        {/* Category badge */}
        <span className="absolute top-2 left-2 rounded-full px-2 py-0.5 text-[10px] font-bold text-white capitalize"
          style={{ backgroundColor: catColor + "dd" }}>
          {p.category}
        </span>

        {/* CF source badge */}
        {rec.source === "hybrid_cf" && affinityPct !== undefined && (
          <span className="absolute top-2 right-2 rounded-full bg-black/60 backdrop-blur-sm px-1.5 py-0.5 text-[9px] font-semibold text-white">
            {Math.round(affinityPct * 100)}% match
          </span>
        )}

        {/* Stock overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="bg-red-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full">Sold Out</span>
          </div>
        )}
        {!isOutOfStock && p.stock <= 5 && (
          <span className="absolute bottom-2 right-2 bg-orange-500/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
            {p.stock} left
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-3 flex flex-col flex-1">
        <h3
          className="text-[13px] font-bold text-gray-900 line-clamp-2 leading-tight mb-1 cursor-pointer hover:text-green-700 transition-colors"
          onClick={() => onNavigate(rec.productId)}
        >{p.title}</h3>

        <div className="flex items-center justify-between mt-auto mb-2">
          <p className="text-sm font-extrabold text-green-700">
            Rs {p.price}
            {p.unit && <span className="text-[10px] font-normal text-gray-400 ml-0.5">/{p.unit}</span>}
          </p>
          {p.location && (
            <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
              <MdLocationPin className="text-green-500 shrink-0" size={11} />
              <span className="truncate max-w-[60px]">{p.location}</span>
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-1.5">
          <button
            onClick={() => onAddToCart(rec)}
            disabled={isOutOfStock || isAdding}
            aria-label={`Add ${p.title} to cart`}
            className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-gray-900 hover:bg-gray-800
                       disabled:bg-gray-200 disabled:cursor-not-allowed text-white disabled:text-gray-400
                       py-2 text-[11px] font-semibold transition-colors"
          >
            <HiOutlineShoppingCart size={12} />
            {isAdding ? "…" : "Cart"}
          </button>
          <button
            onClick={() => onBuyNow(rec)}
            disabled={isOutOfStock || isBuying}
            aria-label={`Buy ${p.title} now`}
            className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-green-600 hover:bg-green-700
                       disabled:bg-gray-200 disabled:cursor-not-allowed text-white disabled:text-gray-400
                       py-2 text-[11px] font-semibold transition-colors"
          >
            <HiOutlineBolt size={12} />
            {isBuying ? "…" : "Buy"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
interface RecommendedForYouProps {
  /** Max number of recommendations to request */
  topN?: number;
  /** Visual variant — "section" adds a white rounded container, "inline" is borderless */
  variant?: "section" | "inline";
  /** Title override */
  title?: string;
}

export default function RecommendedForYou({
  topN = 10,
  variant = "section",
  title,
}: RecommendedForYouProps) {
  const user     = useSelector((state: RootState) => state.user.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const cartCtx  = useContext(CartContext);
  const [recs, setRecs]               = useState<Recommendation[]>([]);
  const [method, setMethod]           = useState<string>("none");
  const [isPersonalised, setPersonal] = useState(false);
  const [affinity, setAffinity]       = useState<Record<string, number>>({});
  const [loading, setLoading]         = useState(false);
  const [addingId, setAddingId]       = useState<string | null>(null);
  const [buyingId, setBuyingId]       = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [canLeft,  setCanLeft]  = useState(false);
  const [canRight, setCanRight] = useState(false);

  // Fetch recs when user logs in
  useEffect(() => {
    if (!user?.token) { setRecs([]); return; }
    setLoading(true);
    fetchMyRecommendations(topN)
      .then(res => {
        setRecs(res.data.recommendations ?? []);
        setMethod(res.data.method ?? "none");
        setPersonal(res.data.isPersonalised ?? false);
        setAffinity(res.data.categoryAffinity ?? {});
      })
      .catch(() => {/* silently skip — don't break the page */})
      .finally(() => setLoading(false));
  }, [user?.token, topN]);

  // Track scroll arrow visibility
  const updateArrows = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 8);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  };

  useEffect(() => {
    updateArrows();
    const el = scrollRef.current;
    el?.addEventListener("scroll", updateArrows, { passive: true });
    return () => el?.removeEventListener("scroll", updateArrows);
  }, [recs]);

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "left" ? -320 : 320, behavior: "smooth" });
  };

  // ── Cart action ────────────────────────────────────────────────────────────
  const handleAddToCart = async (rec: Recommendation) => {
    if (!user?.token) { toast.error("Please login first"); return; }
    const p = rec.product; if (!p) return;
    try {
      setAddingId(rec.productId);
      dispatch(addToCart(p as any));
      await axios.post(
        `${import.meta.env.VITE_API_URL}/cart/addtoCart`,
        { productId: rec.productId, quantity: 1 },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      await cartCtx?.fetchCart();
      toast.success("Added to cart 🛒");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to add to cart");
    } finally {
      setAddingId(null);
    }
  };

  // ── Buy now ────────────────────────────────────────────────────────────────
  const handleBuyNow = async (rec: Recommendation) => {
    if (!user?.token) { toast.error("Please login first"); return; }
    try {
      setBuyingId(rec.productId);
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/order`,
        { productId: rec.productId, quantity: 1 },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      if (!res.data?.paymentUrl) throw new Error("No payment URL returned");
      window.location.assign(res.data.paymentUrl);
    } catch (err: any) {
      if (err?.response?.status === 401) {
        localStorage.removeItem("user"); localStorage.removeItem("token");
        navigate("/login"); return;
      }
      toast.error(err?.response?.data?.message || "Failed to start payment");
      setBuyingId(null);
    }
  };

  // Don't render if not logged in or no recs (after load)
  if (!user?.token) return null;
  if (!loading && recs.length === 0) return null;

  const methodLabel = title ?? (isPersonalised ? METHOD_LABEL[method] : METHOD_LABEL.popularity_fallback);

  const container = variant === "section"
    ? "bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
    : "py-4";

  return (
    <section className={container} aria-label="Recommended products">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 text-white">
            <HiSparkles size={16} />
          </div>
          <div>
            <h2 className="text-[15px] font-bold text-gray-900">
              {isPersonalised ? "Recommended For You" : "Most Popular Right Now"}
            </h2>
            <p className="text-[11px] text-gray-400">{methodLabel}</p>
          </div>
        </div>

        {/* Scroll arrows (desktop) */}
        <div className="hidden sm:flex items-center gap-1">
          <button
            onClick={() => scroll("left")}
            disabled={!canLeft}
            aria-label="Scroll left"
            className="rounded-full border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50
                       disabled:opacity-30 disabled:cursor-default transition-colors"
          >
            <HiChevronLeft size={16} />
          </button>
          <button
            onClick={() => scroll("right")}
            disabled={!canRight}
            aria-label="Scroll right"
            className="rounded-full border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50
                       disabled:opacity-30 disabled:cursor-default transition-colors"
          >
            <HiChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* CF explanation pill — only show for personalised */}
      {isPersonalised && Object.keys(affinity).length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 self-center">Top interests:</span>
          {Object.entries(affinity)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4)
            .map(([cat, pct]) => (
              <span key={cat} className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize text-white"
                style={{ backgroundColor: CAT_COLORS[cat] || "#6b7280" }}>
                {cat} {Math.round(pct * 100)}%
              </span>
            ))}
        </div>
      )}

      {/* Carousel */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-2 scroll-smooth"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {loading
          ? [...Array(5)].map((_, i) => <SkeletonCard key={i} />)
          : recs.map(rec => (
              <ProductCard
                key={rec.productId}
                rec={rec}
                categoryAffinity={affinity}
                onAddToCart={handleAddToCart}
                onBuyNow={handleBuyNow}
                isAdding={addingId === rec.productId}
                isBuying={buyingId === rec.productId}
                onNavigate={(pid) => navigate(`/product/${pid}`)}
              />
            ))
        }
      </div>
    </section>
  );
}

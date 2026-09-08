import { useContext, useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useSearchParams } from "react-router";
import type { RootState } from "../utils/store";
import { addToCart } from "../utils/cartSlice";
import { CartContext } from "./context/CartContext";
import {
  MdLocationPin,
  MdTune,
  MdClose,
  MdGridView,
  MdViewList,
} from "react-icons/md";
import { BiSolidCategoryAlt } from "react-icons/bi";
import { HiOutlineShoppingCart, HiOutlineBolt } from "react-icons/hi2";
import RecommendedForYou from "./RecommendedForYou";
import CheckoutModal from "./CheckoutModal";

// ─── Types ────────────────────────────────────────────────────────────────────
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
}

type SortKey = "newest" | "price-asc" | "price-desc" | "name";
type ViewMode = "grid" | "list";

// ─── Skeleton card ────────────────────────────────────────────────────────────
function ProductSkeleton({ list = false }: { list?: boolean }) {
  if (list) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-4 flex gap-4 animate-pulse">
        <div className="w-32 h-32 rounded-xl bg-gray-200 shrink-0" />
        <div className="flex-1 space-y-3 py-1">
          <div className="h-4 bg-gray-200 rounded w-2/3" />
          <div className="h-3 bg-gray-100 rounded w-full" />
          <div className="h-3 bg-gray-100 rounded w-4/5" />
          <div className="h-8 bg-gray-200 rounded-lg w-1/3 mt-2" />
        </div>
      </div>
    );
  }
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
      <div className="h-52 bg-gray-200" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-100 rounded w-full" />
        <div className="h-3 bg-gray-100 rounded w-5/6" />
        <div className="h-9 bg-gray-200 rounded-xl mt-2" />
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
      <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center">
        <BiSolidCategoryAlt className="text-4xl text-green-300" />
      </div>
      <h3 className="text-xl font-semibold text-gray-700">No products found</h3>
      <p className="text-gray-400 max-w-xs">
        No products match your current filters. Try adjusting your search or
        clearing the filters.
      </p>
      <button
        onClick={onReset}
        className="mt-2 bg-green-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-green-700 transition-colors"
      >
        Clear Filters
      </button>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const MarketPlace = () => {
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.user.user);
  const navigate = useNavigate();
  const searchTerm = useSelector((state: RootState) => state.search.term);
  const cartCtx = useContext(CartContext);
  const [searchParams] = useSearchParams();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [buyingId, setBuyingId] = useState<string | null>(null);

  // checkout modal state
  const [checkoutProduct, setCheckoutProduct] = useState<Product | null>(null);
  const [checkoutQty,     setCheckoutQty]     = useState(1);

  // Filter state
  const [selectedCategory, setSelectedCategory] = useState(
    searchParams.get("category") || "All"
  );
  const [selectedLocation, setSelectedLocation] = useState("All");
  const [maxPrice, setMaxPrice] = useState<number>(0);
  const [sortBy, setSortBy] = useState<SortKey>("newest");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    axios
      .get(`${import.meta.env.VITE_API_URL}/product`)
      .then((res) => {
        const fetched: Product[] = res.data?.products || [];
        const reversed = [...fetched].reverse();
        setProducts(reversed);
        if (reversed.length) {
          setMaxPrice(Math.max(...reversed.map((p) => p.price)));
        }
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  // ── Add to cart ────────────────────────────────────────────────────────────
  const addToCartHandler = async (product: Product) => {
    if (!user?.token) { toast.error("Please login first"); return; }
    try {
      setAddingId(product._id);
      dispatch(addToCart(product));
      await axios.post(
        `${import.meta.env.VITE_API_URL}/cart/addtoCart`,
        { productId: product._id, quantity: 1 },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      await cartCtx?.fetchCart();
      toast.success("Added to cart 🛒");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to add to cart");
    } finally {
      setAddingId(null);
    }
  };

  // ── Buy now — open delivery modal ──────────────────────────────────────────
  const buyNow = (product: Product) => {
    if (!user?.token) { toast.error("Please login first"); return; }
    setCheckoutProduct(product);
    setCheckoutQty(1);
  };

  // ── Filter + sort ──────────────────────────────────────────────────────────
  const categories = [
    "All",
    ...Array.from(new Set(products.map((p) => p.category).filter(Boolean))),
  ];
  const locations = [
    "All",
    ...Array.from(new Set(products.map((p) => p.location).filter(Boolean))),
  ];
  const overallMaxPrice = products.length
    ? Math.max(...products.map((p) => p.price))
    : 1000;

  const resetFilters = () => {
    setSelectedCategory("All");
    setSelectedLocation("All");
    setMaxPrice(overallMaxPrice);
    setSortBy("newest");
  };

  const filtered = products
    .filter((p) => {
      const catOk = selectedCategory === "All" || p.category === selectedCategory;
      const locOk = selectedLocation === "All" || p.location === selectedLocation;
      const priceOk = maxPrice === 0 || p.price <= maxPrice;
      const searchOk =
        searchTerm.trim() === "" ||
        p.title.toLowerCase().includes(searchTerm.trim().toLowerCase());
      return catOk && locOk && priceOk && searchOk;
    })
    .sort((a, b) => {
      if (sortBy === "price-asc") return a.price - b.price;
      if (sortBy === "price-desc") return b.price - a.price;
      if (sortBy === "name") return a.title.localeCompare(b.title);
      return 0; // newest = already reversed
    });

  const activeFilterCount = [
    selectedCategory !== "All",
    selectedLocation !== "All",
    maxPrice < overallMaxPrice && maxPrice > 0,
  ].filter(Boolean).length;

  // ── Filter sidebar (shared between desktop + mobile drawer) ───────────────
  const FilterPanel = () => (
    <div className="space-y-6">
      {/* Category */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-1.5">
          <BiSolidCategoryAlt /> Category
        </p>
        <div className="space-y-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                selectedCategory === cat
                  ? "bg-green-600 text-white"
                  : "text-gray-600 hover:bg-green-50 hover:text-green-700"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Location */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-1.5">
          <MdLocationPin /> Location
        </p>
        <div className="space-y-1">
          {locations.map((loc) => (
            <button
              key={loc}
              onClick={() => setSelectedLocation(loc)}
              className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                selectedLocation === loc
                  ? "bg-green-600 text-white"
                  : "text-gray-600 hover:bg-green-50 hover:text-green-700"
              }`}
            >
              {loc}
            </button>
          ))}
        </div>
      </div>

      {/* Price range */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">
          Max Price
        </p>
        <input
          type="range"
          min={0}
          max={overallMaxPrice || 1000}
          value={maxPrice}
          onChange={(e) => setMaxPrice(Number(e.target.value))}
          className="w-full accent-green-600"
        />
        <div className="flex justify-between text-sm text-gray-500 mt-1">
          <span>Rs 0</span>
          <span className="font-semibold text-green-700">Rs {maxPrice}</span>
        </div>
      </div>

      {/* Reset */}
      {activeFilterCount > 0 && (
        <button
          onClick={resetFilters}
          className="w-full py-2.5 rounded-xl border border-red-200 text-red-500 text-sm font-medium hover:bg-red-50 transition-colors"
        >
          Clear Filters ({activeFilterCount})
        </button>
      )}
    </div>
  );

  return (
    <section className="min-h-screen bg-gray-50">

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">

          <div>
            <h1 className="text-xl font-bold text-gray-900">Marketplace</h1>
            <p className="text-sm text-gray-400">
              {loading ? "Loading…" : `${filtered.length} product${filtered.length !== 1 ? "s" : ""} found`}
            </p>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-400 cursor-pointer"
            >
              <option value="newest">Newest</option>
              <option value="price-asc">Price: Low → High</option>
              <option value="price-desc">Price: High → Low</option>
              <option value="name">Name A–Z</option>
            </select>

            {/* View toggle */}
            <div className="hidden sm:flex items-center bg-gray-100 rounded-xl p-1 gap-1">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded-lg transition-colors ${viewMode === "grid" ? "bg-white text-green-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                aria-label="Grid view"
              >
                <MdGridView size={18} />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded-lg transition-colors ${viewMode === "list" ? "bg-white text-green-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                aria-label="List view"
              >
                <MdViewList size={18} />
              </button>
            </div>

            {/* Mobile filter toggle */}
            <button
              onClick={() => setMobileFiltersOpen(true)}
              className="md:hidden flex items-center gap-1.5 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              <MdTune size={16} />
              Filters
              {activeFilterCount > 0 && (
                <span className="bg-green-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile filter drawer ──────────────────────────────────────────── */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileFiltersOpen(false)} />
          <div className="relative ml-auto w-72 h-full bg-white shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800">Filters</h2>
              <button onClick={() => setMobileFiltersOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100">
                <MdClose size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <FilterPanel />
            </div>
            <div className="px-5 py-4 border-t border-gray-100">
              <button
                onClick={() => setMobileFiltersOpen(false)}
                className="w-full bg-green-600 text-white py-2.5 rounded-xl font-medium hover:bg-green-700 transition-colors"
              >
                Show {filtered.length} results
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6 flex gap-6">
        {/* Desktop sidebar */}
        <aside className="hidden md:block w-56 shrink-0">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 sticky top-[73px]">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                <MdTune className="text-green-600" size={18} />
                Filters
              </h2>
              {activeFilterCount > 0 && (
                <span className="text-xs bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full">
                  {activeFilterCount} active
                </span>
              )}
            </div>
            <FilterPanel />
          </div>
        </aside>

        {/* Product grid / list */}
        <div className="flex-1 min-w-0">

          {loading && (
            viewMode === "list" ? (
              <div className="flex flex-col gap-3">
                {[...Array(5)].map((_, i) => <ProductSkeleton key={i} list />)}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {[...Array(6)].map((_, i) => <ProductSkeleton key={i} />)}
              </div>
            )
          )}

          {!loading && filtered.length === 0 && (
            <EmptyState onReset={resetFilters} />
          )}

          {/* ── GRID VIEW ── */}
          {!loading && filtered.length > 0 && viewMode === "grid" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {filtered.map((product) => (
                <div
                  key={product._id}
                  className="bg-white rounded-2xl border border-gray-100 overflow-hidden group hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                >
                  {/* Clickable image area */}
                  <div
                    className="relative h-52 overflow-hidden bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/product/${product._id}`)}
                  >
                    {product.images ? (
                      <img
                        src={product.images}
                        alt={product.title}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-green-50">
                        <BiSolidCategoryAlt className="text-5xl text-green-200" />
                      </div>
                    )}

                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    {/* Badges */}
                    <div className="absolute top-3 left-3 flex gap-1.5">
                      <span className="bg-green-600/90 backdrop-blur-sm text-white text-[11px] font-semibold px-2.5 py-1 rounded-full capitalize">
                        {product.category}
                      </span>
                    </div>
                    {product.stock === 0 && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <span className="bg-red-600 text-white text-sm font-bold px-4 py-1.5 rounded-full">
                          Out of Stock
                        </span>
                      </div>
                    )}
                    {product.stock > 0 && product.stock <= 5 && (
                      <span className="absolute top-3 right-3 bg-orange-500/90 backdrop-blur-sm text-white text-[11px] font-semibold px-2.5 py-1 rounded-full">
                        {product.stock} left
                      </span>
                    )}
                  </div>

                  {/* Body */}
                  <div className="p-4">
                    <h2
                      className="font-bold text-gray-900 truncate mb-1 cursor-pointer hover:text-green-700 transition-colors"
                      onClick={() => navigate(`/product/${product._id}`)}
                    >
                      {product.title}
                    </h2>
                    <p className="text-xs text-gray-400 line-clamp-2 min-h-[2.5rem]">
                      {product.description}
                    </p>

                    <div className="flex items-center justify-between mt-3">
                      <p className="text-lg font-extrabold text-green-700">
                        Rs {product.price}
                        {product.unit && (
                          <span className="text-xs font-normal text-gray-400 ml-0.5">
                            /{product.unit}
                          </span>
                        )}
                      </p>
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <MdLocationPin className="text-green-500" />
                        {product.location}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => addToCartHandler(product)}
                        disabled={product.stock === 0 || addingId === product._id}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-200 disabled:cursor-not-allowed text-white disabled:text-gray-400 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                      >
                        <HiOutlineShoppingCart size={15} />
                        {addingId === product._id ? "Adding…" : "Add to Cart"}
                      </button>
                      <button
                        onClick={() => buyNow(product)}
                        disabled={product.stock === 0}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-200 disabled:cursor-not-allowed text-white disabled:text-gray-400 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                      >
                        <HiOutlineBolt size={15} />
                        Buy Now
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── LIST VIEW ── */}
          {!loading && filtered.length > 0 && viewMode === "list" && (
            <div className="flex flex-col gap-3">
              {filtered.map((product) => (
                <div
                  key={product._id}
                  className="bg-white rounded-2xl border border-gray-100 p-4 flex gap-4 hover:shadow-md transition-shadow duration-200"
                >
                  {/* Thumbnail */}
                  <div
                    className="relative w-28 h-28 rounded-xl overflow-hidden shrink-0 bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/product/${product._id}`)}
                  >
                    {product.images ? (
                      <img
                        src={product.images}
                        alt={product.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <BiSolidCategoryAlt className="text-3xl text-green-200" />
                      </div>
                    )}
                    {product.stock === 0 && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <span className="text-white text-[10px] font-bold">Sold Out</span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h2
                          className="font-bold text-gray-900 truncate cursor-pointer hover:text-green-700 transition-colors"
                          onClick={() => navigate(`/product/${product._id}`)}
                        >
                          {product.title}
                        </h2>
                        <p className="text-base font-extrabold text-green-700 shrink-0">
                          Rs {product.price}
                          {product.unit && (
                            <span className="text-xs font-normal text-gray-400">/{product.unit}</span>
                          )}
                        </p>
                      </div>
                      <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                        {product.description}
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs bg-green-50 text-green-700 font-medium px-2 py-0.5 rounded-full capitalize">
                          {product.category}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <MdLocationPin className="text-green-500" />
                          {product.location}
                        </span>
                        {product.stock > 0 && product.stock <= 5 && (
                          <span className="text-xs text-orange-500 font-medium">
                            Only {product.stock} left
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => addToCartHandler(product)}
                        disabled={product.stock === 0 || addingId === product._id}
                        className="flex items-center gap-1.5 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-200 disabled:cursor-not-allowed text-white disabled:text-gray-400 px-4 py-2 rounded-xl text-xs font-semibold transition-colors"
                      >
                        <HiOutlineShoppingCart size={13} />
                        {addingId === product._id ? "Adding…" : "Add to Cart"}
                      </button>
                      <button
                        onClick={() => buyNow(product)}
                        disabled={product.stock === 0}
                        className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-200 disabled:cursor-not-allowed text-white disabled:text-gray-400 px-4 py-2 rounded-xl text-xs font-semibold transition-colors"
                      >
                        <HiOutlineBolt size={13} />
                        Buy Now
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Recommended For You ──────────────────────────────────────────── */}
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 pb-10">
        <RecommendedForYou topN={10} variant="section" />
      </div>

      {/* ── Checkout modal ────────────────────────────────────────────────── */}
      {checkoutProduct && user?.token && (
        <CheckoutModal
          mode="buynow"
          product={{
            _id:    checkoutProduct._id,
            title:  checkoutProduct.title,
            price:  checkoutProduct.price,
            unit:   checkoutProduct.unit,
            images: checkoutProduct.images,
          }}
          quantity={checkoutQty}
          token={user.token}
          onClose={() => setCheckoutProduct(null)}
        />
      )}
    </section>
  );
};

export default MarketPlace;

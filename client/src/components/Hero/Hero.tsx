import { useEffect, useState, useContext } from "react";
import { ArrowRight, Leaf, Tractor, ShieldCheck, Truck } from "lucide-react";
import { useNavigate } from "react-router";
import { useSelector, useDispatch } from "react-redux";
import axios from "axios";
import toast from "react-hot-toast";
import { CartContext } from "../context/CartContext";
import { addToCart as addToCartRedux } from "../../utils/cartSlice";
import type { RootState } from "../../utils/store";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Product {
  _id: string;
  title: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  images?: string;
  location: string;
  status?: string;
}

// Static fallback images per category (used when no product image is available)
const CATEGORY_FALLBACKS: Record<string, string> = {
  vegetables:
    "https://www.organicfacts.net/wp-content/uploads/vegetarianfood.jpg",
  fruits:
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRMvZ3THl2GFgadCSMsHRySC_mBiXollI5WrdsNr6W0LbbXbDPSndrVmvk&s=10",
  grains:
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSW9SSN5cxQUm8g9eEWUZz0pT_b_ucFllG8rfgxBz-vPAfGwXd9o7nb3BQ&s=10",
  dairy:
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRCF3uLNayT5taZ4TSBcN-pxYKZA4Is8kjvfTaSMyEaWboKIohCXg1z6tE&s=10",
  other:
    "https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=500",
};

// ─── Skeleton card ────────────────────────────────────────────────────────────
function SkeletonCard({ tall = false }: { tall?: boolean }) {
  return (
    <div className="bg-white rounded-3xl shadow overflow-hidden animate-pulse">
      <div className={`w-full bg-gray-200 ${tall ? "h-72" : "h-56"}`} />
      <div className="p-5 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-100 rounded w-1/2" />
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
const Home = () => {
  const navigate  = useNavigate();
  const dispatch  = useDispatch();
  const cartCtx   = useContext(CartContext);
  const user      = useSelector((state: RootState) => state.user.user);

  const [products,    setProducts]    = useState<Product[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [hover,       setHover]       = useState<number | null>(null);
  const [addingId,    setAddingId]    = useState<string | null>(null);

  // ── Fetch all approved products once ────────────────────────────────────────
  useEffect(() => {
    axios
      .get(`${import.meta.env.VITE_API_URL}/product`)
      .then((res) => setProducts(res.data?.products || []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  // ── Derive categories dynamically ───────────────────────────────────────────
  // Group products by category; pick the first product image as the category cover
  const categoryMap: Record<string, { image: string; count: number }> = {};
  products.forEach((p) => {
    const cat = p.category?.toLowerCase() || "other";
    if (!categoryMap[cat]) {
      categoryMap[cat] = {
        image: p.images || CATEGORY_FALLBACKS[cat] || CATEGORY_FALLBACKS.other,
        count: 0,
      };
    }
    categoryMap[cat].count += 1;
  });

  const categories = Object.entries(categoryMap).map(([title, meta]) => ({
    title: title.charAt(0).toUpperCase() + title.slice(1),
    slug: title,
    image: meta.image,
    count: meta.count,
  }));

  // ── Derive trending — 6 most recently added products with stock > 0 ─────────
  const trending = [...products]
    .filter((p) => p.stock > 0)
    .slice(0, 6);

  // ── Add to cart ──────────────────────────────────────────────────────────────
  const handleAddToCart = async (product: Product) => {
    if (!user?.token) {
      toast.error("Please login first");
      return;
    }
    try {
      setAddingId(product._id);
      dispatch(addToCartRedux(product));
      await axios.post(
        `${import.meta.env.VITE_API_URL}/cart/addtoCart`,
        { productId: product._id, quantity: 1 },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      await cartCtx?.fetchCart();
      toast.success("Added to cart 🛒");
    } catch (error: any) {
      if (error?.response?.status === 401) {
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        navigate("/login");
        return;
      }
      toast.error(error?.response?.data?.message || "Failed to add to cart");
    } finally {
      setAddingId(null);
    }
  };

  // ── Navigate to marketplace filtered by category ─────────────────────────────
  const goToCategory = (slug: string) => {
    navigate(`/?category=${slug}`);
  };

  return (
    <div className="bg-green-50 min-h-screen">

      {/* ── Hero banner ──────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-r from-green-700 to-green-500 text-white">
        <div className="max-w-7xl mx-auto px-6 py-24 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h1 className="text-5xl font-bold leading-tight">
              Fresh Farming Starts Here 🌱
            </h1>
            <p className="mt-6 text-lg opacity-90">
              Buy quality seeds, fertilizers, tools, and fresh produce directly
              from trusted farmers.
            </p>
            <div className="flex gap-4 mt-8">
              <button
                onClick={() => navigate("/")}
                className="bg-white text-green-700 px-6 py-3 rounded-xl font-semibold hover:scale-105 transition"
              >
                Shop Now
              </button>
            </div>
          </div>
          <img
            src="https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=800"
            className="rounded-3xl shadow-2xl"
            alt="Farm"
          />
        </div>
      </section>

      {/* ── Shop by Category ─────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto py-20 px-6">
        <h2 className="text-4xl font-bold text-center mb-12">
          Shop by Category
        </h2>

        {loading ? (
          <div className="grid md:grid-cols-4 gap-8">
            {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : categories.length === 0 ? (
          <p className="text-center text-gray-500">No categories yet.</p>
        ) : (
          <div className={`grid gap-8 ${categories.length <= 2 ? "md:grid-cols-2" : categories.length === 3 ? "md:grid-cols-3" : "md:grid-cols-4"}`}>
            {categories.map((item, index) => (
              <div
                key={item.slug}
                onClick={() => goToCategory(item.slug)}
                onMouseEnter={() => setHover(index)}
                onMouseLeave={() => setHover(null)}
                className="bg-white rounded-3xl shadow-lg overflow-hidden cursor-pointer transition hover:-translate-y-3"
              >
                <div className="relative h-56 overflow-hidden">
                  <img
                    src={item.image}
                    alt={item.title}
                    className={`h-full w-full object-cover transition duration-300 ${
                      hover === index ? "scale-110" : "scale-100"
                    }`}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        CATEGORY_FALLBACKS[item.slug] || CATEGORY_FALLBACKS.other;
                    }}
                  />
                  {/* Product count badge */}
                  <span className="absolute top-3 right-3 bg-green-600 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                    {item.count} {item.count === 1 ? "item" : "items"}
                  </span>
                </div>
                <div className="p-5 flex items-center justify-between">
                  <h3 className="text-xl font-semibold">{item.title}</h3>
                  <ArrowRight size={18} className="text-green-600" />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Trending Products ─────────────────────────────────────────────── */}
      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-center mb-10">
            <h2 className="text-4xl font-bold">Trending Products</h2>
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 text-green-600 hover:text-green-700 font-medium transition-colors"
            >
              View All <ArrowRight size={18} />
            </button>
          </div>

          {loading ? (
            <div className="grid md:grid-cols-3 gap-8">
              {[...Array(3)].map((_, i) => <SkeletonCard key={i} tall />)}
            </div>
          ) : trending.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg">No products available yet.</p>
              <button
                onClick={() => navigate("/")}
                className="mt-4 bg-green-600 text-white px-6 py-2.5 rounded-xl hover:bg-green-700 transition-colors"
              >
                Browse Marketplace
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-8">
              {trending.map((product) => (
                <div
                  key={product._id}
                  className="rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition group"
                >
                  {/* Image */}
                  <div className="relative h-64 overflow-hidden bg-gray-100">
                    {product.images ? (
                      <img
                        src={product.images}
                        alt={product.title}
                        className="h-full w-full object-cover group-hover:scale-105 transition duration-300"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-green-50">
                        <Leaf size={48} className="text-green-300" />
                      </div>
                    )}
                    {/* Category badge */}
                    <span className="absolute top-3 left-3 bg-green-600 text-white text-xs font-semibold px-2.5 py-1 rounded-full capitalize">
                      {product.category}
                    </span>
                    {/* Low stock warning */}
                    {product.stock <= 5 && (
                      <span className="absolute top-3 right-3 bg-orange-500 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                        Only {product.stock} left
                      </span>
                    )}
                  </div>

                  {/* Body */}
                  <div className="p-5 bg-white">
                    <h3 className="font-bold text-xl text-gray-800 truncate">
                      {product.title}
                    </h3>
                    {product.location && (
                      <p className="text-xs text-gray-400 mt-0.5">{product.location}</p>
                    )}
                    <p className="text-green-700 text-lg font-semibold my-3">
                      Rs {product.price}
                    </p>
                    <button
                      onClick={() => handleAddToCart(product)}
                      disabled={addingId === product._id || product.stock === 0}
                      className="w-full bg-green-600 text-white py-2.5 rounded-xl hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                      {addingId === product._id
                        ? "Adding..."
                        : product.stock === 0
                        ? "Out of Stock"
                        : "Add to Cart"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Stats ────────────────────────────────────────────────────────── */}
      <section className="py-20 bg-green-700 text-white">
        <div className="max-w-6xl mx-auto grid md:grid-cols-4 text-center gap-8 px-6">
          <div>
            <h2 className="text-5xl font-bold">
              {loading ? "—" : `${products.length}+`}
            </h2>
            <p className="mt-1">Products Listed</p>
          </div>
          <div>
            <h2 className="text-5xl font-bold">
              {loading ? "—" : `${categories.length}`}
            </h2>
            <p className="mt-1">Categories</p>
          </div>
          <div>
            <h2 className="text-5xl font-bold">15K+</h2>
            <p className="mt-1">Farmers</p>
          </div>
          <div>
            <h2 className="text-5xl font-bold">98%</h2>
            <p className="mt-1">Happy Customers</p>
          </div>
        </div>
      </section>

      {/* ── Why FarmConnect ──────────────────────────────────────────────── */}
      <section className="py-20 bg-green-100">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-4xl font-bold text-center mb-12">
            Why FarmConnect?
          </h2>
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <Leaf className="mx-auto text-green-700" size={45} />
              <h3 className="font-semibold mt-4">Organic Products</h3>
            </div>
            <div>
              <Truck className="mx-auto text-green-700" size={45} />
              <h3 className="font-semibold mt-4">Fast Delivery</h3>
            </div>
            <div>
              <ShieldCheck className="mx-auto text-green-700" size={45} />
              <h3 className="font-semibold mt-4">Secure Payment</h3>
            </div>
            <div>
              <Tractor className="mx-auto text-green-700" size={45} />
              <h3 className="font-semibold mt-4">Trusted Farmers</h3>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;

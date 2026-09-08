import { useEffect, useState, useContext } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { useNavigate } from "react-router";
import { useDispatch, useSelector } from "react-redux";
import { MdLocationPin } from "react-icons/md";
import { addToCart } from "../utils/cartSlice";
import type { RootState } from "../utils/store";
import { CartContext } from "../components/context/CartContext";

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

const Vegetables = () => {
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.user.user);
  const navigate = useNavigate();
  const cartCtx = useContext(CartContext);

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [buyingId, setBuyingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_API_URL}/product`
        );

        const vegetables = res.data.products.filter(
          (product: Product) =>
            product.category.toLowerCase() === "vegetables"
        );

        setProducts(vegetables.reverse());
      } catch {
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const addToCartHandler = async (product: Product) => {
    if (!user?.token) {
      toast.error("Please login first");
      return;
    }

    try {
      dispatch(addToCart(product));

      await axios.post(
        `${import.meta.env.VITE_API_URL}/cart/addtoCart`,
        {
          productId: product._id,
          quantity: 1,
        },
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        }
      );

      await cartCtx?.fetchCart();

      toast.success("Added to cart");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to add to cart");
    }
  };

  const buyNow = async (product: Product) => {
  if (!user || !user.token) {
    toast.error("Please login first");
    return;
  }

  try {
    setBuyingId(product._id);

    const response = await axios.post(
      `${import.meta.env.VITE_API_URL}/order`,
      { productId: product._id, quantity: 1 },
      { headers: { Authorization: `Bearer ${user.token}` } }
    );
    if (!response.data?.paymentUrl) {
      throw new Error("Khalti payment URL was not returned");
    }
    window.location.assign(response.data.paymentUrl);
  } catch (error: any) {
    if (error?.response?.status === 401) {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      navigate("/login");
      return;
    }
    toast.error(error?.response?.data?.message || "Failed to start payment");
    setBuyingId(null);
  }
};

  if (loading) return <p className="p-10">Loading...</p>;

  return (
    <section className="p-8 bg-gray-50 min-h-screen">
      <h1 className="text-4xl font-bold text-center text-green-700 mb-8">
        🥬 Fresh Vegetables
      </h1>

      {products.length === 0 ? (
        <p className="text-center">No vegetables available.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <div
              key={product._id}
              className="bg-white rounded-xl shadow hover:shadow-xl transition"
            >
              <img
                src={product.images}
                alt={product.title}
                className="h-48 w-full object-cover rounded-t-xl"
              />

              <div className="p-4">
                <h2 className="font-bold text-lg">{product.title}</h2>

                <p className="text-sm text-gray-500 line-clamp-2">
                  {product.description}
                </p>

                <div className="flex justify-between items-center mt-3">
                  <span className="font-bold text-green-700">
                    Rs {product.price}
                  </span>

                  <span className="text-sm flex items-center gap-1">
                    <MdLocationPin />
                    {product.location}
                  </span>
                </div>

                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => addToCartHandler(product)}
                    disabled={product.stock === 0}
                    className="flex-1 bg-blue-600 text-white py-2 rounded"
                  >
                    Add Cart
                  </button>

                  <button
                    onClick={() => buyNow(product)}
                    disabled={
                      product.stock === 0 ||
                      buyingId === product._id
                    }
                    className="flex-1 bg-green-600 text-white py-2 rounded"
                  >
                    {buyingId === product._id
                      ? "Redirecting..."
                      : "Buy"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default Vegetables;
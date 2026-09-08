import { FaCartShopping, FaUserPlus } from "react-icons/fa6";
import { IoSearch } from "react-icons/io5";
import { useNavigate } from "react-router";
import { Logo } from "../../constants/image";
import { useContext, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import type { RootState } from "../../utils/store";
import { setSearchTerm } from "../../utils/searchSlice";
import { CartContext } from "../context/CartContext"; // ⚠️ adjust this path to wherever CartContext.tsx actually lives

interface ProductSuggestion {
  _id: string;
  title: string;
}

const Navbar = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const user = useSelector((state: RootState) => state.user.user);
  const searchTerm = useSelector((state: RootState) => state.search.term);

  // ✅ Cart now comes from CartContext, the actual source of truth
  const cartCtx = useContext(CartContext);
  const cartCount = cartCtx?.cart?.items?.length || 0;

  // ✅ Only customers see the cart icon
  const isCustomer = user?.role === "customer";

  const [allProducts, setAllProducts] = useState<ProductSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/product`);
        const fetched = res.data?.products || [];
        setAllProducts(
          fetched.map((p: any) => ({ _id: p._id, title: p.title })),
        );
      } catch (error) {
        console.log(error);
      }
    };

    fetchProducts();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchWrapperRef.current &&
        !searchWrapperRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const suggestions =
    searchTerm.trim() === ""
      ? []
      : allProducts
          .filter((p) =>
            p.title.toLowerCase().includes(searchTerm.trim().toLowerCase()),
          )
          .slice(0, 6);

  const handleSuggestionClick = (title: string) => {
    dispatch(setSearchTerm(title));
    setShowSuggestions(false);
    navigate("/market-place");
  };

  const goToDashboard = () => {
    if (user?.role === "farmer") {
      navigate("/farmerDashboard");
    } else if (user?.role === "customer") {
      navigate("/customerDashboard");
    } else if (user?.role === "admin") {
      navigate("/admin-dashboard");
    } else {
      navigate("/profile");
    }
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200 px-4 sm:px-6 lg:px-10 py-3">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* LOGO */}
        <div className="flex items-center justify-between w-full md:w-auto">
          <div
            onClick={() => navigate("/")}
            className="cursor-pointer flex items-center justify-center p-2 rounded-xl hover:bg-gray-100 transition"
          >
            <img src={Logo} alt="Logo" className="w-36 sm:w-44" />
          </div>

          {/* MOBILE ICONS */}
          <div className="flex md:hidden items-center gap-4 text-xl">
            {/* 🛒 CART MOBILE — customers only */}
            {isCustomer && (
              <div
                className="relative cursor-pointer"
                onClick={() => navigate("/cart")}
              >
                <FaCartShopping />

                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
                    {cartCount}
                  </span>
                )}
              </div>
            )}

            {/* Avatar navigates straight to the role-based dashboard */}
            {user ? (
              <button
                onClick={goToDashboard}
                className="w-10 h-10 rounded-full bg-amber-400 text-white font-bold"
              >
                {user.name?.charAt(0).toUpperCase()}
              </button>
            ) : (
              <button onClick={() => navigate("/login")}>
                <FaUserPlus />
              </button>
            )}
          </div>
        </div>

        {/* SEARCH */}
        <div
          className="w-full md:max-w-xl mx-auto relative"
          ref={searchWrapperRef}
        >
          <div className="flex border rounded-full overflow-hidden">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                dispatch(setSearchTerm(e.target.value));
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Search products..."
              className="flex-1 px-4 py-2 outline-none"
            />

            <button className="bg-orange-500 px-5 text-white" type="button">
              <IoSearch />
            </button>
          </div>

          {/* ✅ SUGGESTIONS DROPDOWN */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50">
              {suggestions.map((item) => (
                <button
                  key={item._id}
                  type="button"
                  onClick={() => handleSuggestionClick(item.title)}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
                >
                  <IoSearch className="text-gray-400" />
                  {item.title}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* DESKTOP MENU */}
        <div className="hidden md:flex items-center gap-6">
          {/* CART DESKTOP — customers only */}
          {isCustomer && (
            <div
              className="relative cursor-pointer"
              onClick={() => navigate("/cart")}
            >
              <FaCartShopping className="text-xl" />

              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
                  {cartCount}
                </span>
              )}
            </div>
          )}

          {/* USER */}
          {user ? (
            <button
              onClick={goToDashboard}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-orange-100"
            >
              <div className="w-8 h-8 bg-amber-500 text-white flex items-center justify-center rounded-full">
                {user.name?.charAt(0).toUpperCase()}
              </div>

              <span>{user.name}</span>
            </button>
          ) : (
            <button
              onClick={() => navigate("/login")}
              className="flex items-center gap-2 bg-purple-500 text-white px-4 py-2 rounded-full"
            >
              <FaUserPlus />
              Login
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

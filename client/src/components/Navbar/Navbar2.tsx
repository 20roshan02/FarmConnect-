import { useState } from "react";
import { Link } from "react-router";
import { menuItems } from "../../constants/menu";

const Navbar = () => {
  const [activeId, setActiveId] = useState(1); 

  return (
    <nav className="hidden lg:flex w-screen bg-gray-200 px-6 py-3 justify-between items-center sticky top-26 z-40">
      <div className="flex gap-6">
        {menuItems.map((item) => (
          <div key={item.id} className="relative group">
            <Link
              to={item.link}
              onClick={() => setActiveId(item.id)}
              className={`text-l font-medium transition hover:text-green-600 ${
                activeId === item.id ? "text-green-600" : "text-gray-800"
              }`}
            >
              {item.label}
            </Link>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-6">
        <span className="text-l font-medium text-gray-800">
          Trending Products
        </span>

        <div className="bg-green-600 text-white px-4 py-2 rounded flex items-center gap-2 font-semibold">
          Get 30% Discount Now
          <span className="bg-white text-green-600 text-xs px-2 py-0.5 rounded-full">
            Sale
          </span>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
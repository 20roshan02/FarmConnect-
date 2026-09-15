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

    </nav>
  );
};

export default Navbar;
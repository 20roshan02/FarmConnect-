import {
  FaLeaf,
  FaTractor,
  FaHandshake,
  FaUsers,
} from "react-icons/fa";
import { useNavigate } from "react-router";

const About = () => {
    const navigate = useNavigate();
  return (
    <div className="bg-green-50 min-h-screen">

      {/* Hero Section */}
      <section className="bg-green-700 text-white py-20">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h1 className="text-5xl font-bold mb-6">About FarmConnect</h1>
          <p className="text-xl max-w-3xl mx-auto">
            Connecting farmers and consumers through a trusted marketplace
            for fresh, high-quality agricultural products.
          </p>
        </div>
      </section>

      {/* Our Story */}
      <section className="max-w-6xl mx-auto px-6 py-20 grid md:grid-cols-2 gap-10 items-center">
        <img
          src="https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=800&q=80"
          alt="Farm"
          className="rounded-2xl shadow-lg"
        />

        <div>
          <h2 className="text-4xl font-bold text-green-700 mb-6">
            Our Story
          </h2>

          <p className="text-gray-700 leading-8">
            FarmConnect was created to bridge the gap between hardworking farmers
            and consumers looking for fresh, reliable agricultural products.
            Our platform enables farmers to showcase their harvest while giving
            buyers access to quality produce, grains, dairy products, and farming
            essentials in one place.
          </p>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="bg-white py-20">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-10">

          <div className="bg-green-100 p-8 rounded-2xl shadow">
            <h2 className="text-3xl font-bold text-green-700 mb-4">
              Our Mission
            </h2>

            <p className="text-gray-700">
              To empower farmers by providing a digital marketplace where
              they can reach more customers while offering consumers fresh,
              affordable, and high-quality agricultural products.
            </p>
          </div>

          <div className="bg-green-100 p-8 rounded-2xl shadow">
            <h2 className="text-3xl font-bold text-green-700 mb-4">
              Our Vision
            </h2>

            <p className="text-gray-700">
              To become the leading agricultural marketplace that promotes
              sustainable farming, supports local communities, and makes
              healthy food accessible to everyone.
            </p>
          </div>

        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-6">

          <h2 className="text-4xl font-bold text-center text-green-700 mb-12">
            Why Choose FarmConnect?
          </h2>

          <div className="grid md:grid-cols-4 gap-8">

            <div className="bg-white p-8 rounded-2xl shadow text-center hover:shadow-xl transition">
              <FaLeaf className="text-5xl text-green-600 mx-auto mb-4" />
              <h3 className="font-bold text-xl mb-2">
                Fresh Products
              </h3>
              <p className="text-gray-600">
                Farm-fresh vegetables, fruits, grains, and dairy.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow text-center hover:shadow-xl transition">
              <FaTractor className="text-5xl text-green-600 mx-auto mb-4" />
              <h3 className="font-bold text-xl mb-2">
                Trusted Farmers
              </h3>
              <p className="text-gray-600">
                Products directly from verified local farmers.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow text-center hover:shadow-xl transition">
              <FaHandshake className="text-5xl text-green-600 mx-auto mb-4" />
              <h3 className="font-bold text-xl mb-2">
                Fair Pricing
              </h3>
              <p className="text-gray-600">
                Better prices for both farmers and customers.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow text-center hover:shadow-xl transition">
              <FaUsers className="text-5xl text-green-600 mx-auto mb-4" />
              <h3 className="font-bold text-xl mb-2">
                Community First
              </h3>
              <p className="text-gray-600">
                Supporting sustainable agriculture and local communities.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* Call To Action */}
      <section className="bg-green-700 text-white py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">

          <h2 className="text-4xl font-bold mb-6">
            Join the FarmConnect Community
          </h2>

          <p className="text-lg mb-8">
            Whether you're a farmer looking to sell or a customer searching for
            fresh products, FarmConnect is here to connect you with the best of agriculture.
          </p>

          <button
          onClick={()=> navigate("/")}
           className="bg-white text-green-700 px-8 py-3 rounded-lg font-semibold hover:bg-green-100 transition">
            Explore Marketplace
          </button>

        </div>
      </section>

    </div>
  );
};

export default About;
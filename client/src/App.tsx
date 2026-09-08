import { Route, Routes, useLocation, Navigate } from "react-router";
import { useSelector } from "react-redux";
import {
  About,
  AdminDashboard,
  Cart,
  ContactForm,
  CustomerProfile,
  CustomerSetting,
  FarmarInfo,
  FarmerDashboard,
  FarmerSetting,
  Footer,
  Hero,
  KhaltiFailure,
  KhaltiSuccess,
  Login,
  MarketPlace,
  MyOrders,
  Navbar,
  Navbar2,
  OrderList,
  VerifyEmail,
} from "./components";
import MyProducts from "./components/farmarInfo/myProducts";
import CustomerDashboard from "./components/CustomerProfile/CustomerDashboard";
import ProductDescription from "./components/Hero/ProductDescription";

const App = () => {
  const location = useLocation();
  const publicRoutes = [
    "/",
    "/home",
    "/contact",
    "/about",
    "/cart",
    "/orders",
    "/payment/success",
    "/payment/khalti/success",
    "/payment/failure",
  ];

  const role = useSelector((state: any) => state.user?.user?.role);
  const isAdmin = role === "admin";
  const isFarmer = role === "farmer";
  const isCustomer = !isAdmin && !isFarmer;
  const showPublicShell = !isFarmer && (isCustomer || publicRoutes.includes(location.pathname));

  const hideNavbar = ["/login", "/signUp"].includes(location.pathname);
  const hideFooter = ["/login", "/signUp"].includes(location.pathname);

  return (
    <div>
      {!hideNavbar && showPublicShell && (
        <>
          <Navbar />
          <Navbar2 />
        </>
      )}

      {isAdmin && (
        <Routes>
          <Route path="/" element={<MarketPlace />} />
          <Route path="/product/:id" element={<ProductDescription />} />
          <Route path="/home" element={<Hero />} />
          <Route
            path="/contact"
            element={
              <>
                <FarmarInfo />
                <ContactForm />
              </>
            }
          />
          <Route path="/about" element={<About />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/orders" element={<MyOrders />} />
          <Route path="/payment/success" element={<KhaltiSuccess />} />
          <Route path="/payment/khalti/success" element={<KhaltiSuccess />} />
          <Route path="/payment/failure" element={<KhaltiFailure />} />
          <Route path="/admin-dashboard" element={<AdminDashboard />} />
          <Route path="*" element={<Navigate to="/admin-dashboard" replace />} />
        </Routes>
      )}

      {isFarmer && (
        <Routes>
          <Route path="/farmerDashboard"      element={<FarmerDashboard />} />
          <Route path="/farmer/analytics"     element={<FarmerDashboard />} />
          <Route path="/farmer/ml"            element={<FarmerDashboard />} />
          <Route path="/farmer/myProducts"    element={<MyProducts />} />
          <Route path="/farmer/orders"        element={<OrderList />} />
          <Route path="/farmer/farmerSetting" element={<FarmerSetting />} />
          <Route path="/login"                element={<Login type="login" />} />
          <Route path="/signUp"               element={<Login type="signUp" />} />
          <Route path="/verify-email/:token"  element={<VerifyEmail />} />
          <Route path="*" element={<Navigate to="/farmerDashboard" replace />} />
        </Routes>
      )}

      {isCustomer && (
        <Routes>
          <Route path="/home" element={<Hero />} />
          <Route path="/product/:id" element={<ProductDescription />} />
          <Route
            path="/contact"
            element={
              <>
                <FarmarInfo />
                <ContactForm />
              </>
            }
          />
          <Route path="/login" element={<Login type="login" />} />
          <Route path="/signUp" element={<Login type="signUp" />} />
          <Route path="/verify-email/:token" element={<VerifyEmail />} />
          <Route path="/customerDashboard" element={<CustomerDashboard />} />
          <Route path="/customer-profile" element={<CustomerProfile />} />
          <Route path="/customer-setting" element={<CustomerSetting />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/orders" element={<MyOrders />} />
          <Route path="/payment/success" element={<KhaltiSuccess />} />
          <Route path="/payment/khalti/success" element={<KhaltiSuccess />} />
          <Route path="/payment/failure" element={<KhaltiFailure />} />
          <Route path="/about" element={<About />} />
          <Route path="/" element={<MarketPlace />} />
        </Routes>
      )}

      {!hideFooter && showPublicShell && <Footer />}
    </div>
  );
};

export default App;
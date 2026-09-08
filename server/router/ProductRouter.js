const express = require("express");

const isFarmer = require("../middleware/isFarmer");
const verifyUser = require("../middleware/auth");
const upload = require("../utils/multer");

const {
  addProduct,
  getProducts,
  getProductsById,
  getMyProducts,
  updateProductsById,
  deleteProducts,
} = require("../controller/productController");

const { getFarmerAnalytics } = require("../controller/adminController");

const route = express.Router();

route.get("/", getProducts);
route.get("/my-products", verifyUser, isFarmer, getMyProducts);
route.get("/farmer-analytics", verifyUser, isFarmer, getFarmerAnalytics);
route.get("/:id", getProductsById);


//  FARMER PROTECTED ROUTES

route.post("/", verifyUser, isFarmer,upload.single("image"), addProduct);

route.put("/:id", verifyUser, isFarmer, updateProductsById);

route.delete("/:id", verifyUser, isFarmer, deleteProducts);

module.exports = route;
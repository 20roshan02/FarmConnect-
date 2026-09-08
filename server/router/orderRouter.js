const express = require("express");
const {
  createOrder,
  createCartOrder,
  verifyKhaltiPayment,
  getMyOrders,
  getFarmerOrders,
} = require("../controller/orderController");
const auth = require("../middleware/auth");
const isFarmer = require("../middleware/isFarmer");
const isApproved = require("../middleware/isApproved");

const router = express.Router();

router.post("/", auth, isApproved, createOrder);
router.post("/cart", auth, isApproved, createCartOrder);
router.post("/khalti/verify", auth, isApproved, verifyKhaltiPayment);
router.get("/my-orders", auth, isApproved, getMyOrders);
router.get("/farmer-orders", auth, isFarmer, getFarmerOrders);

module.exports = router;

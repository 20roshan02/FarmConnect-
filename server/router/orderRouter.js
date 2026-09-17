const express = require("express");
const {
  createOrder,
  createCartOrder,
  initiatePendingOrderPayment,
  deletePendingOrder,
  verifyKhaltiPayment,
  getMyOrders,
  getFarmerOrders,
  getFarmerAnalytics,
} = require("../controller/orderController");
const auth = require("../middleware/auth");
const isFarmer = require("../middleware/isFarmer");
const isApproved = require("../middleware/isApproved");

const router = express.Router();

router.post("/", auth, isApproved, createOrder);
router.post("/cart", auth, isApproved, createCartOrder);
router.post("/:orderId/pay", auth, isApproved, initiatePendingOrderPayment);
router.post("/khalti/verify", auth, isApproved, verifyKhaltiPayment);
router.get("/my-orders", auth, isApproved, getMyOrders);
router.get("/farmer-analytics", auth, isFarmer, getFarmerAnalytics);
router.delete("/:orderId", auth, isApproved, deletePendingOrder);
router.get("/farmer-orders", auth, isFarmer, getFarmerOrders);

module.exports = router;

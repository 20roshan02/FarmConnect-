const express = require("express");
const verifyUser = require("../middleware/auth");
const isApproved = require("../middleware/isApproved");
const {
  addToCart,
  getCart,
  updateCartItem,
  removeCartItem,
  clearCart,
} = require("../controller/cartController");

const router = express.Router();

router.post("/addtoCart", verifyUser, isApproved, addToCart);
router.get("/", verifyUser, isApproved, getCart);
router.put("/update", verifyUser, isApproved, updateCartItem);
router.delete("/remove/:productId", verifyUser, isApproved, removeCartItem);
router.delete("/clear", verifyUser, isApproved, clearCart);

module.exports = router;
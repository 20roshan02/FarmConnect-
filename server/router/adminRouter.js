const express = require("express");
const router = express.Router();

const {
  getPendingProducts,
  getApprovedProducts,
  getRejectedProducts,
  approveProduct,
  rejectProduct,
  getAllFarmers,
  getAllCustomers,
  getAdminAnalytics,
  getFarmersByStatus,
  approveFarmer,
  rejectFarmer,
} = require("../controller/adminController");

const verifyUser = require("../middleware/auth");
const isAdmin = require("../middleware/isAddmin");

// ================= AUTH GUARD =================
router.use(verifyUser);
router.use(isAdmin);

// ================= PRODUCTS =================
router.get("/products/pending", getPendingProducts);
router.get("/products/approved", getApprovedProducts);
router.get("/products/rejected", getRejectedProducts);

router.put("/products/:id/approve", approveProduct);
router.put("/products/:id/reject", rejectProduct);

// ================= USERS =================
router.get("/farmers", getAllFarmers);
router.get("/customers", getAllCustomers);

// ================= FARMER APPROVAL =================
router.get("/farmers/status/:status", getFarmersByStatus);
router.put("/farmers/:id/approve", approveFarmer);
router.put("/farmers/:id/reject", rejectFarmer);

// ================= ANALYTICS =================
router.get("/analytics", getAdminAnalytics);

module.exports = router;
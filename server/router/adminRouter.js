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
  getBusinessSalesRanking,
  getBusinessChurn,
  getBusinessRecommendations,
  getFarmersByStatus,
  approveFarmer,
  rejectFarmer,
} = require("../controller/adminController");

const verifyUser = require("../middleware/auth");
const isAdmin = require("../middleware/isAddmin");

// =====================================================
// AUTH GUARD
// =====================================================

router.use(verifyUser);
router.use(isAdmin);

// =====================================================
// PRODUCTS
// =====================================================

router.get("/products/pending", getPendingProducts);
router.get("/products/approved", getApprovedProducts);
router.get("/products/rejected", getRejectedProducts);

router.put("/products/:id/approve", approveProduct);
router.put("/products/:id/reject", rejectProduct);

// =====================================================
// USERS
// =====================================================

router.get("/farmers", getAllFarmers);
router.get("/customers", getAllCustomers);

// =====================================================
// FARMER APPROVAL
// =====================================================

router.get("/farmers/status/:status", getFarmersByStatus);

router.put("/farmers/:id/approve", approveFarmer);
router.put("/farmers/:id/reject", rejectFarmer);

// =====================================================
// GENERAL ANALYTICS
// =====================================================

router.get("/analytics", getAdminAnalytics);

// =====================================================
// BUSINESS INSIGHTS
// =====================================================

router.get(
  "/business-insights/sales-ranking",
  getBusinessSalesRanking
);

router.get(
  "/business-insights/churn",
  getBusinessChurn
);

router.get(
  "/business-insights/recommendations",
  getBusinessRecommendations
);

// =====================================================
// ROUTER LOAD CHECK
// =====================================================

console.log("Admin router loaded");
console.log("Business Insights handlers:", {
  salesRanking: typeof getBusinessSalesRanking,
  churn: typeof getBusinessChurn,
  recommendations: typeof getBusinessRecommendations,
});

module.exports = router;
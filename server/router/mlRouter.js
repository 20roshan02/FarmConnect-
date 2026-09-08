/**
 * mlRouter.js  v2
 * All ML-powered endpoints.
 *
 * Admin routes  (auth + isAdmin):
 *   GET /api/v1/ml/overview
 *   GET /api/v1/ml/churn
 *   GET /api/v1/ml/segments
 *   GET /api/v1/ml/recommendations
 *   GET /api/v1/ml/user-recommendations/:userId
 *   GET /api/v1/ml/feature-importance
 *
 * Farmer routes (auth + isFarmer):
 *   GET /api/v1/ml/demand/:productId
 *   GET /api/v1/ml/farmer-demand
 */

"use strict";

const express = require("express");
const router  = express.Router();

const verifyUser = require("../middleware/auth");
const isAdmin    = require("../middleware/isAddmin");
const isFarmer   = require("../middleware/isFarmer");
const isApproved = require("../middleware/isApproved");

const {
  getMLOverview,
  getChurnPredictions,
  getCustomerSegments,
  getPlatformRecommendations,
  getUserRecommendations,
  getFeatureImportance,
  getProductDemandForecast,
  getFarmerDemandForecasts,
  getMyRecommendations,
} = require("../controller/mlController");

// ── Customer-facing (any authenticated + approved user) ───────────────────────
router.get("/my-recommendations",            verifyUser, isApproved, getMyRecommendations);

// ── Admin-only ────────────────────────────────────────────────────────────────
router.get("/overview",                      verifyUser, isAdmin, getMLOverview);
router.get("/churn",                         verifyUser, isAdmin, getChurnPredictions);
router.get("/segments",                      verifyUser, isAdmin, getCustomerSegments);
router.get("/recommendations",               verifyUser, isAdmin, getPlatformRecommendations);
router.get("/user-recommendations/:userId",  verifyUser, isAdmin, getUserRecommendations);
router.get("/feature-importance",            verifyUser, isAdmin, getFeatureImportance);

// ── Farmer-only ───────────────────────────────────────────────────────────────
router.get("/demand/:productId",             verifyUser, isFarmer, getProductDemandForecast);
router.get("/farmer-demand",                 verifyUser, isFarmer, getFarmerDemandForecasts);

module.exports = router;

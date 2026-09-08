/**
 * mlController.js  v2
 * API handlers that pull data from MongoDB and run the advanced ML algorithms.
 *
 * Endpoints:
 *   GET /api/v1/ml/overview                     — Admin: unified ML health summary
 *   GET /api/v1/ml/churn                         — Admin: ensemble churn predictions + feature importance
 *   GET /api/v1/ml/segments                      — Admin: K-Means segments with radar + silhouette
 *   GET /api/v1/ml/recommendations               — Admin: hybrid CF platform-wide recs
 *   GET /api/v1/ml/user-recommendations/:userId  — Admin: per-user hybrid CF recs
 *   GET /api/v1/ml/feature-importance            — Admin: platform churn feature importance
 *   GET /api/v1/ml/demand/:productId             — Farmer: GB forecast for one product
 *   GET /api/v1/ml/farmer-demand                 — Farmer: GB forecasts for all products
 */

"use strict";

const Order   = require("../model/orderSchema");
const User    = require("../model/userSchema");
const Product = require("../model/productSchema");

const {
  predictChurn,
  segmentCustomers,
  buildInteractionMatrix,
  hybridCFRecommend,
  popularityRecommend,
  forecastDemand,
  buildCategoryAffinity,
} = require("../ml/mlEngine");

// ─────────────────────────────────────────────────────────────────────────────
// Data-layer helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Builds enriched RFM records for every customer. */
async function buildCustomerRFM() {
  const now = Date.now();

  const [orderAgg, abandonAgg, customers] = await Promise.all([
    Order.aggregate([
      { $match: { status: "paid" } },
      {
        $group: {
          _id:            "$user",
          orderCount:     { $sum: 1 },
          totalSpend:     { $sum: "$amount" },
          avgOrderValue:  { $avg: "$amount" },
          lastOrderDate:  { $max: "$createdAt" },
          firstOrderDate: { $min: "$createdAt" },
        },
      },
    ]),
    Order.aggregate([
      { $match: { status: { $in: ["pending", "failed"] } } },
      {
        $group: {
          _id:           "$user",
          pendingOrders: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
          failedOrders:  { $sum: { $cond: [{ $eq: ["$status", "failed"]  }, 1, 0] } },
        },
      },
    ]),
    User.find({ role: "customer" }).select("_id name email createdAt").lean(),
  ]);

  const orderMap  = new Map(orderAgg.map((o)  => [o._id.toString(),  o]));
  const abandonMap = new Map(abandonAgg.map((a) => [a._id.toString(), a]));

  return customers.map((u) => {
    const uid            = u._id.toString();
    const ord            = orderMap.get(uid);
    const abn            = abandonMap.get(uid) || { pendingOrders: 0, failedOrders: 0 };
    const accountAgeDays = Math.floor((now - new Date(u.createdAt).getTime()) / 86_400_000);
    const recencyDays    = ord
      ? Math.floor((now - new Date(ord.lastOrderDate).getTime()) / 86_400_000)
      : accountAgeDays;

    return {
      userId:        uid,
      name:          u.name,
      email:         u.email,
      recencyDays,
      orderCount:    ord?.orderCount     ?? 0,
      totalSpend:    ord?.totalSpend     ?? 0,
      avgOrderValue: ord?.avgOrderValue  ?? 0,
      pendingOrders: abn.pendingOrders,
      failedOrders:  abn.failedOrders,
      accountAgeDays,
    };
  });
}

/** Fetches all paid user-product interactions, including category metadata. */
async function buildInteractions() {
  const [orders, products] = await Promise.all([
    Order.find({ status: "paid" }).select("user items").lean(),
    Product.find({}).select("_id category").lean(),
  ]);

  const catMap = new Map(products.map((p) => [p._id.toString(), p.category]));
  const interactions = [];

  orders.forEach((order) => {
    order.items.forEach((item) => {
      interactions.push({
        userId:    order.user.toString(),
        productId: item.product.toString(),
        quantity:  item.quantity,
        category:  catMap.get(item.product.toString()) || "other",
      });
    });
  });

  return interactions;
}

/** Enriches a list of { productId, score } with full product documents. */
async function enrichWithProducts(recs, extraSelect = "") {
  const ids      = recs.map((r) => r.productId);
  const products = await Product.find({ _id: { $in: ids }, status: "approved" })
    .select(`title category price images location stock unit ${extraSelect}`.trim())
    .lean();
  const pMap = new Map(products.map((p) => [p._id.toString(), p]));
  return recs
    .map((r) => ({ ...r, product: pMap.get(r.productId) || null }))
    .filter((r) => r.product !== null);
}

// ─────────────────────────────────────────────────────────────────────────────
// Controllers
// ─────────────────────────────────────────────────────────────────────────────

// ── 0. ML Overview (Admin) ────────────────────────────────────────────────────
async function getMLOverview(req, res) {
  try {
    const [customerRFM, interactions] = await Promise.all([
      buildCustomerRFM(),
      buildInteractions(),
    ]);

    // Quick churn summary
    let churnSummary = { high: 0, medium: 0, low: 0, total: 0 };
    let avgChurnScore = 0;
    if (customerRFM.length > 0) {
      const { predictions } = predictChurn(customerRFM);
      predictions.forEach((p) => {
        churnSummary.total++;
        if      (p.churnRisk === "High")   churnSummary.high++;
        else if (p.churnRisk === "Medium") churnSummary.medium++;
        else                               churnSummary.low++;
      });
      avgChurnScore = predictions.length > 0
        ? parseFloat((predictions.reduce((s, p) => s + p.churnScore, 0) / predictions.length).toFixed(4))
        : 0;
    }

    // Quick segment summary
    let segmentSummary = [];
    let silhouette = 0;
    let optimalK = 0;
    if (customerRFM.length >= 4) {
      const seg = segmentCustomers(customerRFM, null);
      silhouette = seg.silhouette;
      optimalK   = seg.optimalK;
      segmentSummary = seg.segments.map((s) => ({ label: s.label, count: s.customers.length }));
    }

    // CF coverage (% of customers with at least 1 order)
    const activeUserIds = new Set(interactions.map((i) => i.userId));
    const cfCoverage = customerRFM.length > 0
      ? parseFloat(((activeUserIds.size / customerRFM.length) * 100).toFixed(1))
      : 0;

    // Total unique products purchased
    const uniqueProducts = new Set(interactions.map((i) => i.productId)).size;

    // Top category by volume
    const catCounts = {};
    interactions.forEach(({ category, quantity }) => {
      catCounts[category] = (catCounts[category] || 0) + quantity;
    });
    const topCategory = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "N/A";

    return res.status(200).json({
      success: true,
      overview: {
        churn:    { ...churnSummary, avgChurnScore },
        segments: { count: segmentSummary.length, silhouette, optimalK, breakdown: segmentSummary },
        cf:       { activeCustomers: activeUserIds.size, totalCustomers: customerRFM.length, cfCoverage, uniqueProductsPurchased: uniqueProducts },
        catalog:  { topCategory },
      },
    });
  } catch (err) {
    console.error("[ML] overview error:", err);
    return res.status(500).json({ success: false, message: "ML overview failed." });
  }
}

// ── 1. Churn Prediction (Admin) ───────────────────────────────────────────────
async function getChurnPredictions(req, res) {
  try {
    const customerRFM = await buildCustomerRFM();

    if (customerRFM.length === 0) {
      return res.status(200).json({
        success: true, predictions: [],
        summary: { high: 0, medium: 0, low: 0, total: 0 },
        platformFeatureImportance: [],
        message: "No customer data yet.",
      });
    }

    const { predictions, platformFeatureImportance } = predictChurn(customerRFM);

    const summary = predictions.reduce(
      (acc, p) => {
        acc.total++;
        if      (p.churnRisk === "High")   acc.high++;
        else if (p.churnRisk === "Medium") acc.medium++;
        else                               acc.low++;
        acc.avgScore = parseFloat(((acc.avgScore * (acc.total - 1) + p.churnScore) / acc.total).toFixed(4));
        return acc;
      },
      { high: 0, medium: 0, low: 0, total: 0, avgScore: 0 }
    );

    // Trend distribution: worsening / stable / improving
    const trendDist = predictions.reduce((acc, p) => {
      acc[p.trendSignal] = (acc[p.trendSignal] || 0) + 1;
      return acc;
    }, {});

    return res.status(200).json({
      success: true, predictions, summary, trendDist, platformFeatureImportance,
    });
  } catch (err) {
    console.error("[ML] churn error:", err);
    return res.status(500).json({ success: false, message: "Churn prediction failed." });
  }
}

// ── 2. Customer Segments (Admin) ─────────────────────────────────────────────
async function getCustomerSegments(req, res) {
  try {
    const k = req.query.k ? Math.min(parseInt(req.query.k, 10), 6) : null; // null = auto
    const customerRFM = await buildCustomerRFM();

    if (customerRFM.length === 0) {
      return res.status(200).json({ success: true, segments: [], summary: [], radarData: [], message: "No customer data yet." });
    }

    const result = segmentCustomers(customerRFM, k);

    const summary = result.segments.map((seg) => ({
      label:      seg.label,
      count:      seg.customers.length,
      avgSpend:   parseFloat((seg.customers.reduce((s, c) => s + c.totalSpend, 0) / (seg.customers.length || 1)).toFixed(2)),
      avgRecency: parseFloat((seg.customers.reduce((s, c) => s + c.recencyDays, 0) / (seg.customers.length || 1)).toFixed(1)),
      avgOrders:  parseFloat((seg.customers.reduce((s, c) => s + c.orderCount,  0) / (seg.customers.length || 1)).toFixed(1)),
      radar:      seg.radar,
    }));

    return res.status(200).json({
      success: true,
      segments:   result.segments,
      summary,
      radarData:  result.radarData,
      centroids:  result.centroids,
      silhouette: result.silhouette,
      optimalK:   result.optimalK,
      inertia:    result.inertia,
    });
  } catch (err) {
    console.error("[ML] segments error:", err);
    return res.status(500).json({ success: false, message: "Customer segmentation failed." });
  }
}

// ── 3. Platform-wide Hybrid CF Recommendations (Admin) ───────────────────────
async function getPlatformRecommendations(req, res) {
  try {
    const interactions = await buildInteractions();
    if (interactions.length === 0) {
      return res.status(200).json({ success: true, recommendations: [], message: "No order data yet." });
    }

    const topN   = parseInt(req.query.topN, 10) || 12;
    const popular = popularityRecommend(interactions, topN);
    const enriched = await enrichWithProducts(popular);

    // Category breakdown of popular items
    const catBreakdown = {};
    enriched.forEach((r) => {
      const cat = r.product?.category || "other";
      catBreakdown[cat] = (catBreakdown[cat] || 0) + 1;
    });

    return res.status(200).json({
      success: true,
      recommendations: enriched.map((r) => ({
        productId:    r.productId,
        score:        parseFloat(r.score.toFixed(2)),
        uniqueBuyers: r.uniqueBuyers ?? 0,
        product:      r.product,
      })),
      categoryBreakdown: Object.entries(catBreakdown).map(([category, count]) => ({ category, count })),
    });
  } catch (err) {
    console.error("[ML] platform recs error:", err);
    return res.status(500).json({ success: false, message: "Recommendations failed." });
  }
}

// ── 4. Per-user Hybrid CF Recommendations (Admin) ────────────────────────────
async function getUserRecommendations(req, res) {
  try {
    const targetUserId = req.params.userId;
    if (!targetUserId) return res.status(400).json({ success: false, message: "userId is required." });

    const topN         = parseInt(req.query.topN, 10) || 10;
    const interactions = await buildInteractions();

    if (interactions.length === 0) {
      return res.status(200).json({ success: true, recommendations: [], method: "none", userId: targetUserId });
    }

    const matrix = buildInteractionMatrix(interactions);
    const hasHistory = matrix.userItem.has(targetUserId.toString());

    let recommendations, method, categoryAffinity = {};

    if (hasHistory) {
      const result = hybridCFRecommend(targetUserId, matrix, topN, { neighborCount: 10 });
      recommendations = await enrichWithProducts(result.recommendations);
      method          = result.method;
      categoryAffinity = result.categoryAffinity;
    } else {
      const popular   = popularityRecommend(interactions, topN);
      recommendations = await enrichWithProducts(popular);
      method          = "popularity_fallback";
    }

    return res.status(200).json({
      success: true,
      recommendations: recommendations.map((r) => ({
        productId: r.productId,
        score:     parseFloat((r.score ?? 0).toFixed(4)),
        source:    r.source || method,
        product:   r.product,
      })),
      userId: targetUserId,
      method,
      categoryAffinity,
    });
  } catch (err) {
    console.error("[ML] user recs error:", err);
    return res.status(500).json({ success: false, message: "User recommendations failed." });
  }
}

// ── 5. Platform Churn Feature Importance (Admin) ─────────────────────────────
async function getFeatureImportance(req, res) {
  try {
    const customerRFM = await buildCustomerRFM();
    if (customerRFM.length === 0) {
      return res.status(200).json({ success: true, featureImportance: [], message: "No customer data yet." });
    }

    const { platformFeatureImportance } = predictChurn(customerRFM);
    return res.status(200).json({ success: true, featureImportance: platformFeatureImportance });
  } catch (err) {
    console.error("[ML] feature importance error:", err);
    return res.status(500).json({ success: false, message: "Feature importance failed." });
  }
}

// ── 6. Demand Forecast — single product (Farmer) ─────────────────────────────
async function getProductDemandForecast(req, res) {
  try {
    const farmerId  = req.user?.id || req.user?._id;
    const productId = req.params.productId;

    const product = await Product.findOne({ _id: productId, farmer: farmerId }).lean();
    if (!product) return res.status(404).json({ success: false, message: "Product not found or access denied." });

    const salesAgg = await Order.aggregate([
      { $match: { status: "paid" } },
      { $unwind: "$items" },
      { $match: { "items.product": product._id } },
      {
        $group: {
          _id:       { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          unitsSold: { $sum: "$items.quantity" },
          revenue:   { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    const monthlySales = salesAgg.map((s) => ({
      month:     `${s._id.year}-${String(s._id.month).padStart(2, "0")}`,
      unitsSold: s.unitsSold,
      revenue:   s.revenue,
    }));

    const forecastMonths = Math.min(parseInt(req.query.months, 10) || 3, 12);
    const result         = forecastDemand(monthlySales, product.stock, product.price, forecastMonths);

    // Stock health signal
    const totalForecastDemand = result.forecast.reduce((s, f) => s + f.predictedUnits, 0);
    const stockStatus = product.stock === 0           ? "out_of_stock"
                      : product.stock < totalForecastDemand * 0.5 ? "critical"
                      : product.stock < totalForecastDemand       ? "low"
                      : "healthy";

    return res.status(200).json({
      success: true,
      product: {
        _id: product._id, title: product.title, category: product.category,
        price: product.price, stock: product.stock, unit: product.unit,
      },
      historicalSales: monthlySales,
      stockStatus,
      totalForecastDemand,
      ...result,
    });
  } catch (err) {
    console.error("[ML] demand forecast error:", err);
    return res.status(500).json({ success: false, message: "Demand forecast failed." });
  }
}

// ── 7. Demand Forecast — all farmer products (Farmer) ────────────────────────
async function getFarmerDemandForecasts(req, res) {
  try {
    const farmerId = req.user?.id || req.user?._id;
    const products = await Product.find({ farmer: farmerId }).lean();

    if (products.length === 0) {
      return res.status(200).json({ success: true, forecasts: [], message: "No products found." });
    }

    const productIds     = products.map((p) => p._id);
    const forecastMonths = Math.min(parseInt(req.query.months, 10) || 3, 12);

    const salesAgg = await Order.aggregate([
      { $match: { status: "paid" } },
      { $unwind: "$items" },
      { $match: { "items.product": { $in: productIds } } },
      {
        $group: {
          _id: {
            product: "$items.product",
            year:    { $year:  "$createdAt" },
            month:   { $month: "$createdAt" },
          },
          unitsSold: { $sum: "$items.quantity" },
          revenue:   { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    const salesByProduct = new Map();
    salesAgg.forEach((s) => {
      const pid = s._id.product.toString();
      if (!salesByProduct.has(pid)) salesByProduct.set(pid, []);
      salesByProduct.get(pid).push({
        month:     `${s._id.year}-${String(s._id.month).padStart(2, "0")}`,
        unitsSold: s.unitsSold,
        revenue:   s.revenue,
      });
    });

    const forecasts = products.map((p) => {
      const pid          = p._id.toString();
      const monthlySales = salesByProduct.get(pid) || [];
      const result       = forecastDemand(monthlySales, p.stock, p.price, forecastMonths);
      const totalForecastDemand = result.forecast.reduce((s, f) => s + f.predictedUnits, 0);
      const stockStatus = p.stock === 0                              ? "out_of_stock"
                        : p.stock < totalForecastDemand * 0.5        ? "critical"
                        : p.stock < totalForecastDemand              ? "low"
                        : "healthy";

      return {
        product: {
          _id: p._id, title: p.title.substring(0, 30),
          category: p.category, price: p.price, stock: p.stock, unit: p.unit,
        },
        historicalSales: monthlySales,
        stockStatus,
        totalForecastDemand,
        ...result,
      };
    });

    // Portfolio-level summary
    const alertCount = forecasts.filter((f) => ["critical", "out_of_stock"].includes(f.stockStatus)).length;
    const totalForecastRevenue = forecasts.reduce(
      (s, f) => s + f.forecast.reduce((ss, fp) => ss + fp.predictedUnits * f.product.price, 0), 0
    );

    return res.status(200).json({
      success: true, forecasts, forecastMonths,
      portfolio: {
        alertCount,
        totalForecastRevenue: parseFloat(totalForecastRevenue.toFixed(2)),
        trendingUp:   forecasts.filter((f) => f.trend?.direction === "increasing").length,
        trendingDown: forecasts.filter((f) => f.trend?.direction === "decreasing").length,
      },
    });
  } catch (err) {
    console.error("[ML] farmer demand error:", err);
    return res.status(500).json({ success: false, message: "Farmer demand forecast failed." });
  }
}

// ── 8. My Recommendations — customer-facing endpoint ─────────────────────────
// Called directly by the browser for the logged-in customer.
// Uses hybrid CF if the user has history, popularity fallback otherwise.
// Returns enriched product cards ready to render in the UI.
async function getMyRecommendations(req, res) {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) return res.status(401).json({ success: false, message: "Not authenticated." });

    const topN         = Math.min(parseInt(req.query.topN, 10) || 8, 20);
    const interactions = await buildInteractions();

    if (interactions.length === 0) {
      return res.status(200).json({
        success: true, recommendations: [], method: "none",
        message: "No purchase data on the platform yet.",
      });
    }

    const matrix = buildInteractionMatrix(interactions);
    const uid    = userId.toString();
    const hasHistory = matrix.userItem.has(uid);

    let recs, method, categoryAffinity = {};

    if (hasHistory) {
      const result   = hybridCFRecommend(uid, matrix, topN, { neighborCount: 10 });
      recs            = result.recommendations;
      method          = result.method;
      categoryAffinity = result.categoryAffinity;
    } else {
      recs   = popularityRecommend(interactions, topN);
      method = "popularity_fallback";
    }

    const enriched = await enrichWithProducts(recs);

    // Exclude products the user has already ordered
    const userOrders = await Order.find({ user: userId, status: "paid" }).select("items").lean();
    const alreadyBought = new Set(
      userOrders.flatMap(o => o.items.map(i => i.product.toString()))
    );

    const filtered = enriched.filter(r => !alreadyBought.has(r.productId));

    return res.status(200).json({
      success: true,
      recommendations: filtered.map(r => ({
        productId:   r.productId,
        score:       parseFloat((r.score ?? 0).toFixed(4)),
        source:      r.source || method,
        product:     r.product,
      })),
      method,
      categoryAffinity,
      isPersonalised: hasHistory,
    });
  } catch (err) {
    console.error("[ML] my-recommendations error:", err);
    return res.status(500).json({ success: false, message: "Recommendations failed." });
  }
}

module.exports = {
  getMLOverview,
  getChurnPredictions,
  getCustomerSegments,
  getPlatformRecommendations,
  getUserRecommendations,
  getFeatureImportance,
  getProductDemandForecast,
  getFarmerDemandForecasts,
  getMyRecommendations,
};

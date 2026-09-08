const Product = require("../model/productSchema");
const User = require("../model/userSchema");
const Order = require("../model/orderSchema");

async function getPendingProducts( req, res ) {
    try {
    const products = await Product.find({ status: "pending" })
      .populate("farmer", "name email");

    res.status(200).json({
      success: true,
      products,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch pending products",
    });
  }
}

async function getApprovedProducts( req, res ) {
    try {
    const products = await Product.find({ status: "approved" })
      .populate("farmer", "name email");

    res.status(200).json({
      success: true,
      products,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch approved products",
    });
  }
};

async function getRejectedProducts( req, res ) {
    try {
    const products = await Product.find({ status: "rejected" })
      .populate("farmer", "name email");

    res.status(200).json({
      success: true,
      products,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch rejected products",
    });
  }
};

async function approveProduct( req, res ) {
    try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    product.status = "approved";
    await product.save();

    res.status(200).json({
      success: true,
      message: "Product approved",
      product,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to approve product",
    });
  }
};

async function rejectProduct( req, res ) {
    try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    product.status = "rejected";
    await product.save();

    res.status(200).json({
      success: true,
      message: "Product rejected",
      product,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to reject product",
    });
  }
};

async function getAllFarmers(req, res) {
    try {
    const farmers = await User.find({ role: "farmer" }).select("-password");

    res.status(200).json({
      success: true,
      farmers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch farmers",
    });
  }
}

async function getFarmersByStatus(req, res) {
  try {
    const { status } = req.params;
    const farmers = await User.find({ role: "farmer", approvalStatus: status }).select("-password");
    res.status(200).json({ success: true, farmers });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch farmers" });
  }
}

async function approveFarmer(req, res) {
  try {
    const farmer = await User.findOneAndUpdate(
      { _id: req.params.id, role: "farmer" },
      { $set: { approvalStatus: "approved" } },
      { new: true, runValidators: true },
    ).select("-password");
    if (!farmer) {
      return res.status(404).json({ success: false, message: "Farmer not found" });
    }
    res.status(200).json({ success: true, message: "Farmer approved", farmer });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to approve farmer" });
  }
}

async function rejectFarmer(req, res) {
  try {
    const farmer = await User.findOneAndUpdate(
      { _id: req.params.id, role: "farmer" },
      { $set: { approvalStatus: "rejected" } },
      { new: true, runValidators: true },
    ).select("-password");
    if (!farmer) {
      return res.status(404).json({ success: false, message: "Farmer not found" });
    }
    res.status(200).json({ success: true, message: "Farmer rejected", farmer });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to reject farmer" });
  }
};

async function getAllCustomers( req, res ) {
    try {
    const customers = await User.find({ role: "customer" });

    res.status(200).json({
      success: true,
      customers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch customers",
    });
  }
};

async function getAdminAnalytics(req, res) {
  try {
    const [pending, approved, rejected] = await Promise.all([
      Product.countDocuments({ status: "pending" }),
      Product.countDocuments({ status: "approved" }),
      Product.countDocuments({ status: "rejected" }),
    ]);

    const categoryAgg = await Product.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    const productsByCategory = categoryAgg.map((c) => ({
      category: c._id || "other",
      count: c.count,
    }));

    const [farmerCount, customerCount] = await Promise.all([
      User.countDocuments({ role: "farmer" }),
      User.countDocuments({ role: "customer" }),
    ]);

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const userGrowthAgg = await User.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            role: "$role",
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    const monthMap = {};
    userGrowthAgg.forEach(({ _id, count }) => {
      const key = `${_id.year}-${String(_id.month).padStart(2, "0")}`;
      if (!monthMap[key]) monthMap[key] = { month: key, farmers: 0, customers: 0 };
      if (_id.role === "farmer") monthMap[key].farmers += count;
      if (_id.role === "customer") monthMap[key].customers += count;
    });
    const userGrowth = Object.values(monthMap);

    const revenueAgg = await Order.aggregate([
      { $match: { status: "paid", createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          revenue: { $sum: "$amount" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);
    const revenueByMonth = revenueAgg.map((r) => ({
      month: `${r._id.year}-${String(r._id.month).padStart(2, "0")}`,
      revenue: r.revenue,
      orders: r.orders,
    }));

    const topProductsAgg = await Order.aggregate([
      { $match: { status: "paid" } },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product",
          totalQty: { $sum: "$items.quantity" },
          totalRevenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
        },
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          title: { $ifNull: ["$product.title", "Unknown"] },
          totalQty: 1,
          totalRevenue: 1,
        },
      },
    ]);

    const totalRevenueAgg = await Order.aggregate([
      { $match: { status: "paid" } },
      { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
    ]);
    const totalRevenue = totalRevenueAgg[0]?.total ?? 0;
    const totalOrders = totalRevenueAgg[0]?.count ?? 0;

    return res.status(200).json({
      success: true,
      productStatus: { pending, approved, rejected },
      productsByCategory,
      userGrowth,
      revenueByMonth,
      topProducts: topProductsAgg,
      summary: { totalRevenue, totalOrders, farmerCount, customerCount },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Analytics failed" });
  }
}

async function getFarmerAnalytics(req, res) {
  try {
    const farmerId = req.user?.id || req.user?._id;

    const products = await Product.find({ farmer: farmerId });
    const productIds = products.map((p) => p._id);

    const stockData = products
      .sort((a, b) => b.stock - a.stock)
      .slice(0, 10)
      .map((p) => ({ name: p.title.substring(0, 20), stock: p.stock, price: p.price }));

    const catMap = {};
    products.forEach((p) => {
      catMap[p.category] = (catMap[p.category] || 0) + 1;
    });
    const productsByCategory = Object.entries(catMap).map(([category, count]) => ({
      category,
      count,
    }));

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const revenueAgg = await Order.aggregate([
      { $match: { status: "paid", createdAt: { $gte: sixMonthsAgo } } },
      { $unwind: "$items" },
      { $match: { "items.product": { $in: productIds } } },
      {
        $group: {
          _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
          unitsSold: { $sum: "$items.quantity" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);
    const revenueByMonth = revenueAgg.map((r) => ({
      month: `${r._id.year}-${String(r._id.month).padStart(2, "0")}`,
      revenue: r.revenue,
      unitsSold: r.unitsSold,
    }));

    const topProductsAgg = await Order.aggregate([
      { $match: { status: "paid" } },
      { $unwind: "$items" },
      { $match: { "items.product": { $in: productIds } } },
      {
        $group: {
          _id: "$items.product",
          totalRevenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
          totalQty: { $sum: "$items.quantity" },
        },
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 5 },
    ]);

    const topProducts = topProductsAgg.map((t) => {
      const prod = products.find((p) => p._id.toString() === t._id.toString());
      return {
        title: prod?.title?.substring(0, 20) ?? "Unknown",
        totalRevenue: t.totalRevenue,
        totalQty: t.totalQty,
      };
    });

    const orderStatusAgg = await Order.aggregate([
      { $unwind: "$items" },
      { $match: { "items.product": { $in: productIds } } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    const orderStatus = orderStatusAgg.map((o) => ({ status: o._id, count: o.count }));

    const totalRevenueAgg = await Order.aggregate([
      { $match: { status: "paid" } },
      { $unwind: "$items" },
      { $match: { "items.product": { $in: productIds } } },
      {
        $group: {
          _id: null,
          total: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
          units: { $sum: "$items.quantity" },
        },
      },
    ]);
    const totalRevenue = totalRevenueAgg[0]?.total ?? 0;
    const totalUnitsSold = totalRevenueAgg[0]?.units ?? 0;
    const totalStock = products.reduce((s, p) => s + p.stock, 0);
    const estimatedValue = products.reduce((s, p) => s + p.price * p.stock, 0);

    return res.status(200).json({
      success: true,
      stockData,
      productsByCategory,
      revenueByMonth,
      topProducts,
      orderStatus,
      summary: {
        totalProducts: products.length,
        totalStock,
        estimatedValue,
        totalRevenue,
        totalUnitsSold,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Farmer analytics failed" });
  }
}

module.exports = {
    getPendingProducts,
    getApprovedProducts,
    getRejectedProducts,
    approveProduct,
    rejectProduct,
    getAllFarmers,
    getAllCustomers,
    getAdminAnalytics,
    getFarmerAnalytics,
    getFarmersByStatus,
    approveFarmer,
    rejectFarmer,
}

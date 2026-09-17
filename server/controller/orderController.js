const Order = require("../model/orderSchema");
const Product = require("../model/productSchema");
const Cart = require("../model/cartSchema");
const errorHandler = require("../utils/errorHandler");
const Payment = require("../model/paymentSchema.ts").default;
const { getKhaltiService } = require("../services/khalti.service.ts");
// ===============================
// SINGLE PRODUCT "BUY NOW"
// ===============================
async function createOrder(req, res) {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }

    let khaltiService;
    try {
      khaltiService = getKhaltiService();
    } catch (error) {
      return res.status(503).json({ success: false, message: error.message });
    }

    const { productId, quantity, deliveryAddress } = req.body;
    if (!productId) {
      return res.status(400).json({ success: false, message: "productId is required" });
    }

    // Validate delivery address
    if (
      !deliveryAddress ||
      !deliveryAddress.fullName?.trim() ||
      !deliveryAddress.phone?.trim() ||
      !deliveryAddress.street?.trim() ||
      !deliveryAddress.city?.trim() ||
      !deliveryAddress.district?.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Delivery address is required (fullName, phone, street, city, district)",
      });
    }

    const qty = Number(quantity) > 0 ? Number(quantity) : 1;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }
    if (product.stock < qty) {
      return res.status(400).json({ success: false, message: "Insufficient stock" });
    }

    const amount = product.price * qty;

    const order = await Order.create({
      user: userId,
      items: [{ product: product._id, quantity: qty, price: product.price }],
      amount,
      totalAmount: amount,
      deliveryAddress: {
        fullName: deliveryAddress.fullName.trim(),
        phone:    deliveryAddress.phone.trim(),
        street:   deliveryAddress.street.trim(),
        city:     deliveryAddress.city.trim(),
        district: deliveryAddress.district.trim(),
        zip:      deliveryAddress.zip?.trim() || "",
        notes:    deliveryAddress.notes?.trim() || "",
      },
      paymentStatus: "pending",
      orderStatus:   "pending",
      status:        "pending",
    });

    const payment = await Payment.create({
      userId,
      orderId: order._id,
      amount: Math.round(amount * 100),
      paymentGateway: "khalti",
      status: "pending",
    });

    try {
      const khaltiPayment = await khaltiService.initiatePayment({
        amount: Math.round(amount * 100),
        purchaseOrderId: order._id.toString(),
        purchaseOrderName: `FarmConnect Order ${order._id}`,
        returnUrl: `${process.env.FRONTEND_URL}/payment/success`,
        websiteUrl: process.env.FRONTEND_URL,
      });

      payment.pidx = khaltiPayment.pidx;
      await payment.save();

      return res.status(201).json({
        success: true,
        message: "Payment initiated successfully",
        orderId: order._id,
        paymentId: payment._id,
        pidx: khaltiPayment.pidx,
        paymentUrl: khaltiPayment.payment_url,
      });
    } catch (error) {
      payment.status = "failed";
      await payment.save();
      throw error;
    }
  } catch (error) {
    return errorHandler(res, error);
  }
}

// ===============================
// CART CHECKOUT
// ===============================
async function createCartOrder(req, res) {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }

    let khaltiService;
    try {
      khaltiService = getKhaltiService();
    } catch (error) {
      return res.status(503).json({
        success: false,
        message: error.message,
      });
    }

    const { deliveryAddress } = req.body;

    // Validate delivery address
    if (
      !deliveryAddress ||
      !deliveryAddress.fullName?.trim() ||
      !deliveryAddress.phone?.trim() ||
      !deliveryAddress.street?.trim() ||
      !deliveryAddress.city?.trim() ||
      !deliveryAddress.district?.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Delivery address is required (fullName, phone, street, city, district)",
      });
    }

    const cleanAddress = {
      fullName: deliveryAddress.fullName.trim(),
      phone:    deliveryAddress.phone.trim(),
      street:   deliveryAddress.street.trim(),
      city:     deliveryAddress.city.trim(),
      district: deliveryAddress.district.trim(),
      zip:      deliveryAddress.zip?.trim() || "",
      notes:    deliveryAddress.notes?.trim() || "",
    };

    const cart = await Cart.findOne({ user: userId }).populate("items.product");

    if (!cart || !cart.items || cart.items.length === 0) {
      return res.status(400).json({ success: false, message: "Cart is empty" });
    }

    // Filter out any items whose product was deleted from the catalogue
    const validItems = cart.items.filter((item) => item.product != null);

    if (validItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: "All products in your cart are no longer available. Please add new items.",
      });
    }

    for (const item of validItems) {
      if (item.quantity > item.product.stock) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${item.product.title}`,
        });
      }
    }

    const orderItems = validItems.map((item) => ({
      product: item.product._id,
      quantity: item.quantity,
      price: item.product.price,
    }));

    const amount = orderItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    const sameItems = (existingItems = []) =>
      existingItems.length === orderItems.length &&
      existingItems.every((item, index) => {
        const nextItem = orderItems[index];
        return (
          item.product.toString() === nextItem.product.toString() &&
          item.quantity === nextItem.quantity &&
          item.price === nextItem.price
        );
      });

    let order = await Order.findOne({
      user: userId,
      paymentStatus: "pending",
      orderStatus: "pending",
      status: "pending",
      totalAmount: amount,
    }).sort({ createdAt: -1 });

    if (!order || !sameItems(order.items)) {
      order = await Order.create({
        user: userId,
        items: orderItems,
        amount,
        totalAmount: amount,
        deliveryAddress: cleanAddress,
        paymentStatus: "pending",
        orderStatus:   "pending",
        status:        "pending",
      });
    } else {
      // Update delivery address on the existing pending order
      order.deliveryAddress = cleanAddress;
      await order.save();
    }

    let payment = await Payment.findOne({
      userId,
      orderId: order._id,
      status: "pending",
    });

    if (!payment) {
      payment = await Payment.create({
        userId,
        orderId: order._id,
        amount: Math.round(amount * 100),
        paymentGateway: "khalti",
        status: "pending",
      });
    }

    try {
      const khaltiPayment = await khaltiService.initiatePayment({
        amount: Math.round(amount * 100),
        purchaseOrderId: order._id.toString(),
        purchaseOrderName: `FarmConnect Order ${order._id}`,
        returnUrl: `${process.env.FRONTEND_URL}/payment/success`,
        websiteUrl: process.env.FRONTEND_URL,
      });

      payment.pidx = khaltiPayment.pidx;
      await payment.save();

      return res.status(201).json({
        success: true,
        message: "Payment initiated successfully",
        orderId: order._id,
        paymentId: payment._id,
        pidx: khaltiPayment.pidx,
        paymentUrl: khaltiPayment.payment_url,
      });
    } catch (error) {
      payment.status = "failed";
      await payment.save();
      throw error;
    }
  } catch (error) {
    return errorHandler(res, error);
  }
}

// ===============================
// RETRY PAYMENT FOR A PENDING ORDER
// ===============================
async function initiatePendingOrderPayment(req, res) {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }

    const order = await Order.findOne({
      _id: req.params.orderId,
      user: userId,
      paymentStatus: "pending",
      status: "pending",
    });
    if (!order) {
      return res.status(404).json({ success: false, message: "Pending order not found" });
    }

    const khaltiService = getKhaltiService();
    let payment = await Payment.findOne({ userId, orderId: order._id }).sort({ createdAt: -1 });
    if (payment?.status === "paid") {
      return res.status(400).json({ success: false, message: "Order has already been paid" });
    }

    if (!payment) {
      payment = await Payment.create({
        userId,
        orderId: order._id,
        amount: Math.round(order.totalAmount * 100),
        paymentGateway: "khalti",
        status: "pending",
      });
    } else {
      payment.status = "pending";
      payment.pidx = undefined;
      await payment.save();
    }

    try {
      const khaltiPayment = await khaltiService.initiatePayment({
        amount: Math.round(order.totalAmount * 100),
        purchaseOrderId: order._id.toString(),
        purchaseOrderName: `FarmConnect Order ${order._id}`,
        returnUrl: `${process.env.FRONTEND_URL}/payment/success`,
        websiteUrl: process.env.FRONTEND_URL,
      });

      payment.pidx = khaltiPayment.pidx;
      await payment.save();
      return res.status(200).json({ success: true, paymentUrl: khaltiPayment.payment_url });
    } catch (error) {
      payment.status = "failed";
      await payment.save();
      throw error;
    }
  } catch (error) {
    return errorHandler(res, error);
  }
}

// ===============================
// DELETE A CUSTOMER'S PENDING ORDER
// ===============================
async function deletePendingOrder(req, res) {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }

    const order = await Order.findOne({
      _id: req.params.orderId,
      user: userId,
      paymentStatus: "pending",
      status: "pending",
    });
    if (!order) {
      return res.status(404).json({ success: false, message: "Only pending orders can be deleted" });
    }

    for (const item of order.items) {
      await Product.updateOne({ _id: item.product }, { $inc: { stock: item.quantity } });
    }

    await Payment.deleteMany({ userId, orderId: order._id, status: "pending" });
    await order.deleteOne();

    return res.status(200).json({ success: true, message: "Pending order deleted" });
  } catch (error) {
    return errorHandler(res, error);
  }
}

// ===============================
// KHALTI PAYMENT VERIFICATION
// ===============================
async function verifyKhaltiPayment(req, res) {
  const userId = req.user?.id || req.user?._id;
  const { pidx } = req.body;

  if (!userId) {
    return res.status(401).json({ success: false, message: "Not authenticated" });
  }

  if (!pidx || typeof pidx !== "string") {
    return res.status(400).json({ success: false, message: "pidx is required" });
  }

  try {
    const payment = await Payment.findOne({ pidx, userId });
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    if (payment.status === "paid") {
      return res.status(200).json({
        success: true,
        message: "Payment already verified",
        paymentStatus: payment.status,
        orderId: payment.orderId,
        transactionId: payment.transactionId,
        amountPaid: payment.amount / 100,
        paidAt: payment.paidAt,
      });
    }

    if (payment.status === "failed") {
      return res.status(400).json({
        success: false,
        message: "Payment has already failed",
        paymentStatus: payment.status,
        orderId: payment.orderId,
      });
    }

    const order = await Order.findOne({ _id: payment.orderId, user: userId });
    if (!order) {
      payment.status = "failed";
      await payment.save();
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    let verifiedPayment;
    try {
      verifiedPayment = await getKhaltiService().verifyPayment(pidx);
    } catch (error) {
      payment.status = "failed";
      await payment.save();
      return errorHandler(res, error);
    }

    const expectedAmount = Math.round(order.totalAmount * 100);
    const isAmountValid =
      verifiedPayment.total_amount === expectedAmount &&
      verifiedPayment.total_amount === payment.amount;

    if (verifiedPayment.status !== "Completed" || !isAmountValid) {
      payment.status = "failed";
      await payment.save();
      return res.status(400).json({
        success: false,
        message: !isAmountValid
          ? "Payment amount does not match the order"
          : "Khalti payment was not completed",
        paymentStatus: payment.status,
        orderId: order._id,
      });
    }

    if (!verifiedPayment.transaction_id) {
      payment.status = "failed";
      await payment.save();
      return res.status(400).json({
        success: false,
        message: "Khalti did not return a transaction ID",
        paymentStatus: payment.status,
        orderId: order._id,
      });
    }

    const productIds = order.items.map((item) => item.product);
    const products = await Product.find({ _id: { $in: productIds } });
    const productMap = new Map(products.map((product) => [product._id.toString(), product]));

    for (const item of order.items) {
      const product = productMap.get(item.product.toString());
      if (!product || product.stock < item.quantity) {
        payment.status = "failed";
        await payment.save();
        return res.status(400).json({
          success: false,
          message: "Insufficient stock to complete this order",
          paymentStatus: payment.status,
          orderId: order._id,
        });
      }
    }

    for (const item of order.items) {
      await Product.updateOne(
        { _id: item.product, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } },
      );
    }

    payment.status = "paid";
    payment.transactionId = verifiedPayment.transaction_id;
    payment.paidAt = new Date();
    await payment.save();

    order.paymentStatus = "paid";
    order.orderStatus = "confirmed";
    order.status = "paid";
    await order.save();

    await Cart.findOneAndUpdate(
      { user: userId },
      { $set: { items: [], totalPrice: 0 } },
    );

    return res.status(200).json({
      success: true,
      message: "Payment verified and order confirmed",
      paymentStatus: payment.status,
      orderId: order._id,
      transactionId: payment.transactionId,
      amountPaid: payment.amount / 100,
      paidAt: payment.paidAt,
    });
  } catch (error) {
    return errorHandler(res, error);
  }
}

// ===============================
// GET MY ORDERS (customer order history)
// ===============================
async function getMyOrders(req, res) {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }

    const orders = await Order.find({ user: userId })
      .populate("items.product", "title images price")
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, orders });
  } catch (error) {
    return errorHandler(res, error);
  }
}

// ===============================
// GET FARMER ORDERS — orders that contain at least one of this farmer's products
async function getFarmerOrders(req, res) {
  try {
    const farmerId = req.user?.id || req.user?._id;
    if (!farmerId) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }

    // 1. Find all product IDs belonging to this farmer
    const farmerProducts = await Product.find({ farmer: farmerId }).select("_id").lean();
    const productIds = farmerProducts.map((p) => p._id);

    if (productIds.length === 0) {
      return res.status(200).json({ success: true, orders: [] });
    }

    // 2. Find orders containing at least one of those products
    //    Use a single populate() call with an options array to avoid
    //    Mongoose chained-populate issues on subdocument paths
    const orders = await Order.find({ "items.product": { $in: productIds } })
      .populate([
        { path: "items.product", select: "title images price" },
        { path: "user", select: "name email" },
      ])
      .sort({ createdAt: -1 })
      .lean();

    // 3. For each order, keep only the items belonging to this farmer
    const productIdStrings = new Set(productIds.map((id) => id.toString()));

    const farmerOrders = orders.map((order) => {
      const myItems = (order.items || []).filter(
        (item) => item.product && productIdStrings.has(item.product._id.toString())
      );
      const myTotal = myItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );
      return {
        _id: order._id,
        status: order.status,
        createdAt: order.createdAt,
        customer: order.user,
        items: myItems,
        myTotal,
      };
    });

    return res.status(200).json({ success: true, orders: farmerOrders });
  } catch (error) {
    return errorHandler(res, error);
  }
}

// ===============================
// FARMER BUSINESS ANALYTICS
// ===============================
async function getFarmerAnalytics(req, res) {
  try {
    const farmerId = req.user?.id || req.user?._id;
    if (!farmerId) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }

    const products = await Product.find({ farmer: farmerId })
      .select("_id title stock category price")
      .lean();
    const productIds = products.map((product) => product._id);
    const productMap = new Map(products.map((product) => [product._id.toString(), product]));

    const orders = productIds.length === 0
      ? []
      : await Order.find({ "items.product": { $in: productIds } })
        .populate("user", "name")
        .sort({ createdAt: -1 })
        .lean();

    const farmerItems = (order) => (order.items || []).filter((item) =>
      productMap.has(item.product?.toString()),
    );
    const orderTotalForFarmer = (items) => items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    const paidOrders = orders.filter((order) => order.paymentStatus === "paid" || order.status === "paid");
    const pendingOrders = orders.filter((order) => order.paymentStatus === "pending" || order.status === "pending");

    const totalRevenue = paidOrders.reduce(
      (sum, order) => sum + orderTotalForFarmer(farmerItems(order)),
      0,
    );

    const productSales = new Map();
    paidOrders.forEach((order) => {
      farmerItems(order).forEach((item) => {
        const productId = item.product.toString();
        const current = productSales.get(productId) || { quantitySold: 0, revenue: 0 };
        current.quantitySold += item.quantity;
        current.revenue += item.price * item.quantity;
        productSales.set(productId, current);
      });
    });

    const topProducts = [...productSales.entries()]
      .sort(([, left], [, right]) => right.revenue - left.revenue)
      .slice(0, 5)
      .map(([productId, sales]) => ({
        product: productMap.get(productId)?.title || "Product unavailable",
        quantitySold: sales.quantitySold,
        revenue: sales.revenue,
      }));

    const categorySales = new Map();
    paidOrders.forEach((order) => {
      farmerItems(order).forEach((item) => {
        const category = productMap.get(item.product.toString())?.category || "other";
        categorySales.set(category, (categorySales.get(category) || 0) + item.quantity);
      });
    });

    const monthlyRevenue = new Map();
    paidOrders.forEach((order) => {
      const month = new Date(order.createdAt).toISOString().slice(0, 7);
      monthlyRevenue.set(month, (monthlyRevenue.get(month) || 0) + orderTotalForFarmer(farmerItems(order)));
    });

    const recentOrders = orders.slice(0, 5).map((order) => {
      const items = farmerItems(order);
      return {
        _id: order._id,
        customer: order.user?.name || "Customer",
        product: items.map((item) => productMap.get(item.product.toString())?.title || "Product unavailable").join(", "),
        quantity: items.reduce((sum, item) => sum + item.quantity, 0),
        amount: orderTotalForFarmer(items),
        paymentStatus: order.paymentStatus || order.status,
        createdAt: order.createdAt,
      };
    });

    return res.status(200).json({
      success: true,
      summary: {
        totalRevenue,
        totalOrders: orders.length,
        paidOrders: paidOrders.length,
        pendingOrders: pendingOrders.length,
      },
      topProducts,
      lowStockProducts: products
        .filter((product) => product.stock < 10)
        .map((product) => ({ title: product.title, stock: product.stock })),
      categorySales: [...categorySales.entries()].map(([category, quantity]) => ({ category, quantity })),
      monthlyRevenue: [...monthlyRevenue.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .slice(-12)
        .map(([month, revenue]) => ({ month, revenue })),
      recentOrders,
    });
  } catch (error) {
    return errorHandler(res, error);
  }
}

module.exports = {
  createOrder,
  createCartOrder,
  initiatePendingOrderPayment,
  deletePendingOrder,
  verifyKhaltiPayment,
  getMyOrders,
  getFarmerOrders,
  getFarmerAnalytics,
};

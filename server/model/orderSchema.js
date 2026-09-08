const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    quantity: { type: Number, required: true, default: 1 },
    price: { type: Number, required: true }, // price per unit at time of order
  },
  { _id: false }
);

const deliveryAddressSchema = new mongoose.Schema(
  {
    fullName:  { type: String, required: true, trim: true },
    phone:     { type: String, required: true, trim: true },
    street:    { type: String, required: true, trim: true },
    city:      { type: String, required: true, trim: true },
    district:  { type: String, required: true, trim: true },
    zip:       { type: String, default: "", trim: true },
    notes:     { type: String, default: "", trim: true },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: (v) => Array.isArray(v) && v.length > 0,
    },
    amount: {
      type: Number, // total amount in NPR for this order
      required: true,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    deliveryAddress: {
      type: deliveryAddressSchema,
      default: null,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },
    orderStatus: {
      type: String,
      enum: ["pending", "confirmed", "completed", "cancelled"],
      default: "pending",
    },
    status: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);

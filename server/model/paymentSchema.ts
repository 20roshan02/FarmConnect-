import mongoose, { type Document, type Model } from "mongoose";

export type PaymentGateway = "khalti";
export type PaymentStatus = "pending" | "paid" | "failed";

export interface Payment {
  userId: mongoose.Types.ObjectId;
  orderId: mongoose.Types.ObjectId;
  amount: number;
  paymentGateway: PaymentGateway;
  pidx?: string;
  transactionId?: string;
  status: PaymentStatus;
  paidAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PaymentDocument extends Payment, Document {}

const paymentSchema = new mongoose.Schema<PaymentDocument>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    paymentGateway: {
      type: String,
      enum: ["khalti"],
      required: true,
    },
    pidx: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
      trim: true,
    },
    transactionId: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "paid", "failed"],
      required: true,
      default: "pending",
    },
    paidAt: {
      type: Date,
    },
  },
  { timestamps: true },
);

paymentSchema.index({ userId: 1 });
paymentSchema.index({ orderId: 1 });
paymentSchema.index(
  { orderId: 1 },
  {
    name: "one_paid_payment_per_order",
    unique: true,
    partialFilterExpression: { status: "paid" },
  },
);

const PaymentModel: Model<PaymentDocument> = mongoose.model<PaymentDocument>(
  "Payment",
  paymentSchema,
);

export default PaymentModel;
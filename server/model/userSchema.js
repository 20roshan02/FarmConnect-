const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 8,
    },

    role: {
      type: String,
      enum: ["customer", "farmer", "admin"],
      default: "customer",
      required: true,
    },

    verify: {
      type: Boolean,
      default: false,
    },

    // Farmers require admin approval before they can log in.
    // Customers and admins are auto-approved on registration.
    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);


const Users = mongoose.model("User", userSchema);

module.exports = Users;
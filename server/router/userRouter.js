const express = require("express");
const {
  verifyEmail,
  adduser,
  userSignIn,
  getUserById,
  updateUserById,
  changePassword,
  deleteUserById,
} = require("../controller/userController");
const auth = require("../middleware/auth"); 
const isApproved = require("../middleware/isApproved");

const route = express.Router();

// public
route.post("/signUp", adduser);
route.get("/verify-email/:token", verifyEmail);
route.post("/login", userSignIn);

// protected — operate on the logged-in user, no :id needed
route.get("/profile", auth, isApproved, getUserById);
route.put("/profile", auth, isApproved, updateUserById);
route.put("/change-password", auth, isApproved, changePassword);
route.delete("/", auth, isApproved, deleteUserById);

module.exports = route;
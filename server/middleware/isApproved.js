const Users = require("../model/userSchema");

async function isApproved(req, res, next) {
  if (!req.user || req.user.role !== "farmer") {
    return next();
  }

  try {
    const farmer = await Users.findById(req.user.id).select("role approvalStatus");

    if (!farmer || farmer.role !== "farmer" || farmer.approvalStatus !== "approved") {
      return res.status(403).json({
        success: false,
        message: "Farmer account approval is required",
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to verify account approval",
    });
  }
}

module.exports = isApproved;
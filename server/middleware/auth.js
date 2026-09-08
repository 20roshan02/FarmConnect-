const { verifyToken } = require("../utils/generatesTokens");
const Users = require("../model/userSchema");

const verifyUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Please sign in",
      });
    }

    const token = authHeader.split(" ")[1];

    let decoded;

    try {
      decoded = verifyToken(token);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
    }

    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    if (decoded.role === "farmer") {
      const farmer = await Users.findById(decoded.id).select(
        "role approvalStatus",
      );

      if (
        !farmer ||
        farmer.role !== "farmer" ||
        farmer.approvalStatus !== "approved"
      ) {
        return res.status(403).json({
          success: false,
          message: "Farmer account approval is required",
        });
      }
    }

    req.user = decoded; // MUST contain id + role

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Authentication failed",
    });
  }
};

module.exports = verifyUser;
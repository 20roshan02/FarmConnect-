const jwt = require("jsonwebtoken");

// ======================
// ACCESS TOKEN (LOGIN)
// ======================
function generateAccessToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
}

// ======================
// REFRESH TOKEN
// ======================
function generateRefreshToken(payload) {
  return jwt.sign(payload, process.env.REFRESH_SECRET, {
    expiresIn: "7d",
  });
}

// ======================
// EMAIL VERIFICATION TOKEN
// ======================
function generateVerificationToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: "15m",
  });
}

// ======================
// VERIFY TOKEN
// ======================
function verifyToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    console.error("JWT verification failed:", error.message);
    return null;
  }
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateVerificationToken,
  verifyToken,
};

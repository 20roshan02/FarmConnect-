const errorHandler = (res, error) => {
  
  console.error("Error caught by errorHandler:", error);

  return res.status(500).json({
    success: false,
    message:
      process.env.NODE_ENV === "production"
        ? "Server error"
        : error.message || "Server error",
    error: error.message,
  });
};

module.exports = errorHandler;
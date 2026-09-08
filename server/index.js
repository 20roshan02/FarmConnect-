const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");

const express = require("express");
const cors = require("cors");
require("dotenv").config();
const connectDb = require("./config/connectDb");
const userRouter = require("./router/userRouter");
const productRouter = require("./router/ProductRouter");
const orderRouter = require("./router/orderRouter");
const cartRouter = require("./router/cartRouter");
const adminRouter = require("./router/adminRouter");
const mlRouter = require("./router/mlRouter");
const cloudinaryConfig = require("./config/cloudinaryConfig");


const app = express();
app.use(cors());
app.use(express.json());


app.use((req, res, next) => {
  console.log(`INCOMING REQUEST: ${req.method} ${req.originalUrl}`);
  next();
});

const PORT = process.env.PORT || 3000;
app.get("/", (req, res) => {
    res.send("Backend is working");
});

app.use("/api/v1/admin", adminRouter);
app.use("/api/v1/ml", mlRouter);
app.use("/api/v1/user", userRouter);
app.use("/api/v1/product", productRouter);
app.use("/api/v1/cart", cartRouter);
app.use("/api/v1/order", orderRouter);

app.listen(PORT, () => {
    console.log(`Server Started ${PORT}`);
    connectDb();
    cloudinaryConfig()
});
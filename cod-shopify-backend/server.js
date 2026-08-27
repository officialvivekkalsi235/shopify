const express = require("express");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./config/db");
const orderRoutes = require("./routes/orderRoutes");
const shopifyRoutes = require("./routes/shopifyRoutes");

const app = express();

connectDB();

app.use(cors());
app.use(express.json());
app.use("/api/orders", orderRoutes);
app.use("/api/shopify", shopifyRoutes);

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "COD Shopify Backend is running",
  });
});


const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
const express = require("express");
const Order = require("../models/Order");

const router = express.Router();

router.post("/createorder", async (req, res) => {
  try {
    console.log("BODY RECEIVED:", req.body);

    const order = await Order.create(req.body);

    console.log("ORDER SAVED:", order);

    res.status(201).json({
      success: true,
      message: "Order saved successfully",
      order,
    });
  } catch (error) {
    console.log("SAVE ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
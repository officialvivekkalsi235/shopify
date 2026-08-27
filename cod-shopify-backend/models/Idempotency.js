const mongoose = require("mongoose");

const idempotencySchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    status: {
      type: String,
      enum: [
        "processing",
        "completed",
        "failed",
        "unknown",
      ],
      default: "processing",
    },

    requestPayload: {
      type: Object,
      default: null,
    },

    shopifyOrderId: {
      type: String,
      default: null,
    },

    orderNumber: {
      type: String,
      default: null,
    },

    responseData: {
      type: Object,
      default: null,
    },

    errorMessage: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "Idempotency",
  idempotencySchema
);
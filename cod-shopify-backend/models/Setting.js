const mongoose = require("mongoose");

const settingSchema = new mongoose.Schema(
  {
    blockedPincodes: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Setting", settingSchema);

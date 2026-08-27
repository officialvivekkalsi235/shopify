const express = require("express");
const Setting = require("../models/Setting");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    let settings = await Setting.findOne();

    if (!settings) {
      settings = await Setting.create({
        blockedPincodes: [],
      });
    }

    return res.status(200).json({
      success: true,
      settings: {
        blockedPincodes: settings.blockedPincodes || [],
      },
    });
  } catch (error) {
    console.error("GET SETTINGS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load merchant settings",
    });
  }
});

router.put("/pincodes", async (req, res) => {
  try {
    const { blockedPincodes } = req.body;

    if (!Array.isArray(blockedPincodes)) {
      return res.status(400).json({
        success: false,
        message: "blockedPincodes must be an array",
      });
    }

    const cleanedPincodes = blockedPincodes
      .map((pincode) => String(pincode).trim())
      .filter((pincode) => /^\d{6}$/.test(pincode));

    // Remove duplicates
    const uniquePincodes = [...new Set(cleanedPincodes)];

    const settings = await Setting.findOneAndUpdate(
      {},
      {
        $set: {
          blockedPincodes: uniquePincodes,
        },
      },
      {
        new: true,
        upsert: true,
      },
    );

    return res.status(200).json({
      success: true,

      message: "Blocked pincodes updated successfully",

      settings: {
        blockedPincodes: settings.blockedPincodes,
      },
    });
  } catch (error) {
    console.error("UPDATE SETTINGS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update blocked pincodes",
    });
  }
});

router.get("/check-pincode/:pincode", async (req, res) => {
  try {
    const pincode = String(req.params.pincode).trim();

    if (!/^\d{6}$/.test(pincode)) {
      return res.status(400).json({
        success: false,
        message: "Invalid pincode",
      });
    }

    const settings = await Setting.findOne();

    const blocked = settings?.blockedPincodes?.includes(pincode) || false;

    return res.status(200).json({
      success: true,

      pincode,

      blocked,

      codAvailable: !blocked,

      message: blocked
        ? "Cash on Delivery is not available for this pincode."
        : "Cash on Delivery is available.",
    });
  } catch (error) {
    console.error("PINCODE CHECK ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to check pincode",
    });
  }
});

module.exports = router;

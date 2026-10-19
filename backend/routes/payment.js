
const express = require("express");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/User");
const Payment = require("../models/Payment");

const router = express.Router();

// Verify the logged-in user is an admin.
async function requireAdmin(req, res, next) {
  try {
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        message: "Server configuration error.",
      });
    }

    const [scheme, token, ...extraParts] = (
      req.get("authorization") || ""
    ).trim().split(/\s+/);

    if (
      scheme?.toLowerCase() !== "bearer" ||
      !token ||
      extraParts.length > 0
    ) {
      return res.status(401).json({
        message: "A valid authorization token is required.",
      });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);

    if (
      !payload ||
      typeof payload === "string" ||
      typeof payload.id !== "string" ||
      !mongoose.isValidObjectId(payload.id)
    ) {
      return res.status(401).json({
        message: "Invalid authorization token.",
      });
    }

    const admin = await User.findById(payload.id).select("role");

    if (!admin || admin.role !== "admin") {
      return res.status(403).json({
        message: "Admin access is required.",
      });
    }

    req.adminId = admin._id;
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError" ||
        error.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "A valid authorization token is required.",
      });
    }

    console.error("Admin verification error:", error.message);

    return res.status(500).json({
      message: "Unable to verify admin access.",
    });
  }
}

// Record a payment for a registered member.
router.post("/", requireAdmin, async (req, res) => {
  try {
    const {
      memberId,
      amount,
      paymentMethod,
      paymentStatus,
      membershipPlan,
    } = req.body;

    if (
      !memberId ||
      !mongoose.isValidObjectId(memberId) ||
      amount === undefined ||
      amount === null ||
      amount === "" ||
      !Number.isFinite(Number(amount)) ||
      Number(amount) <= 0 ||
      !["Cash", "UPI", "Card", "Bank Transfer"].includes(paymentMethod) ||
      !["Paid", "Pending"].includes(paymentStatus) ||
      !["MONTHLY", "QUARTERLY", "YEARLY"].includes(membershipPlan)
    ) {
      return res.status(400).json({
        message: "Please provide valid payment details.",
      });
    }

    const member = await User.findOne({
      _id: memberId,
      role: "member",
    });

    if (!member) {
      return res.status(404).json({
        message: "Registered member not found.",
      });
    }

    const payment = await Payment.create({
      member: member._id,
      amount: Number(amount),
      paymentMethod,
      paymentStatus,
      membershipPlan,
    });

    return res.status(201).json({
      message: "Payment record saved successfully.",
      payment,
    });
  } catch (error) {
    console.error("Payment creation error:", error.message);

    return res.status(500).json({
      message: "Unable to save payment record.",
    });
  }
});

// View all payment records. Admin only.
router.get("/", requireAdmin, async (req, res) => {
  try {
    const payments = await Payment.find()
      .populate("member", "name email")
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      totalPayments: payments.length,
      payments,
    });
  } catch (error) {
    console.error("Payment lookup error:", error.message);

    return res.status(500).json({
      message: "Unable to load payment records.",
    });
  }
});

module.exports = router;

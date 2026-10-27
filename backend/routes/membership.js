
const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();
const planDurations = {
  MONTHLY: 1,
  QUARTERLY: 3,
  YEARLY: 12,
};

function requireAdmin(req, res, next) {
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

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    if (
      !payload ||
      typeof payload === "string" ||
      typeof payload.id !== "string" ||
      !/^[a-f\d]{24}$/i.test(payload.id)
    ) {
      return res.status(401).json({
        message: "Invalid authorization token.",
      });
    }

    req.authenticatedUserId = payload.id;
    next();
  } catch {
    return res.status(401).json({
      message: "A valid authorization token is required.",
    });
  }
}

// Add calendar months without overflowing the final day of a month.
function addMonths(date, months) {
  const result = new Date(date);
  const day = result.getDate();

  result.setDate(1);
  result.setMonth(result.getMonth() + months);

  const lastDay = new Date(
    result.getFullYear(),
    result.getMonth() + 1,
    0
  ).getDate();

  result.setDate(Math.min(day, lastDay));
  return result;
}

// Assign a membership plan to a registered member.
router.put("/assign/:memberId", requireAdmin, async (req, res) => {
  try {
    const admin = await User.findById(
      req.authenticatedUserId
    ).select("role");

    if (!admin || admin.role !== "admin") {
      return res.status(403).json({
        message: "Admin access is required.",
      });
    }

    const { memberId } = req.params;
    const { membershipPlan } = req.body;

    if (!/^[a-f\d]{24}$/i.test(memberId)) {
      return res.status(400).json({
        message: "Invalid member ID.",
      });
    }

    if (!Object.hasOwn(planDurations, membershipPlan)) {
      return res.status(400).json({
        message: "Choose a valid membership plan.",
      });
    }

    const member = await User.findOne({
      _id: memberId,
      role: "member",
    });

    if (!member) {
      return res.status(404).json({
        message: "Member not found.",
      });
    }

    const startDate = new Date();
    const expiryDate = addMonths(
      startDate,
      planDurations[membershipPlan]
    );

    member.membershipPlan = membershipPlan;
    member.membershipStartDate = startDate;
    member.membershipExpiryDate = expiryDate;
    member.membershipStatus = "Active";

    await member.save();

    return res.json({
      message: "Membership assigned successfully.",
      member: {
        _id: member._id,
        name: member.name,
        email: member.email,
        membershipPlan: member.membershipPlan,
        membershipStartDate: member.membershipStartDate,
        membershipExpiryDate: member.membershipExpiryDate,
        membershipStatus: member.membershipStatus,
      },
    });
  } catch (error) {
    console.error("Membership assignment error:", error.message);

    return res.status(500).json({
      message: "Unable to assign membership.",
    });
  }
});

router.post("/select", async (req, res) => {
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

    let payload;

    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({
        message: "A valid authorization token is required.",
      });
    }

    if (
      !payload ||
      typeof payload === "string" ||
      typeof payload.id !== "string" ||
      !/^[a-f\d]{24}$/i.test(payload.id)
    ) {
      return res.status(401).json({
        message: "Invalid authorization token.",
      });
    }

    const member = await User.findOne({
      _id: payload.id,
      role: "member",
    });

    if (!member) {
      return res.status(404).json({
        message: "Member account not found.",
      });
    }

    const { membershipPlan } = req.body;

    if (!Object.hasOwn(planDurations, membershipPlan)) {
      return res.status(400).json({
        message: "Choose a valid membership plan.",
      });
    }

    const startDate = new Date();
    const expiryDate = addMonths(
      startDate,
      planDurations[membershipPlan]
    );

    member.membershipPlan = membershipPlan;
    member.membershipStartDate = startDate;
    member.membershipExpiryDate = expiryDate;
    member.membershipStatus = "Active";
    await member.save();

    return res.json({
      message: "Membership plan selected successfully.",
      membershipPlan: member.membershipPlan,
      membershipStartDate: member.membershipStartDate,
      membershipExpiryDate: member.membershipExpiryDate,
      membershipStatus: member.membershipStatus,
    });
  } catch (error) {
    console.error("Member plan selection error:", error.message);

    return res.status(500).json({
      message: "Unable to select membership plan.",
    });
  }
});

router.get("/my-membership", async (req, res) => {
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

    let payload;

    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({
        message: "A valid authorization token is required.",
      });
    }

    if (
      !payload ||
      typeof payload === "string" ||
      typeof payload.id !== "string" ||
      !/^[a-f\d]{24}$/i.test(payload.id)
    ) {
      return res.status(401).json({
        message: "Invalid authorization token.",
      });
    }

    const member = await User.findOne({
      _id: payload.id,
      role: "member",
    }).select(
      "membershipPlan membershipStartDate membershipExpiryDate membershipStatus"
    );

    if (!member) {
      return res.status(404).json({
        message: "Member account not found.",
      });
    }

    let status = "Not Assigned";

    if (member.membershipPlan && member.membershipExpiryDate) {
      status =
        new Date(member.membershipExpiryDate) >= new Date()
          ? "Active"
          : "Expired";
    }

    return res.json({
      membershipPlan: member.membershipPlan,
      membershipStartDate: member.membershipStartDate,
      membershipExpiryDate: member.membershipExpiryDate,
      membershipStatus: status,
    });
  } catch (error) {
    console.error("Membership lookup error:", error.message);

    return res.status(500).json({
      message: "Unable to load membership details.",
    });
  }
});

module.exports = router;

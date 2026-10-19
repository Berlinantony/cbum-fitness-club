
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["admin", "member"],
      default: "member",
    },

    // Membership details
    membershipPlan: {
      type: String,
      enum: ["MONTHLY", "QUARTERLY", "YEARLY", null],
      default: null,
    },
    membershipStartDate: {
      type: Date,
      default: null,
    },
    membershipExpiryDate: {
      type: Date,
      default: null,
    },
    membershipStatus: {
      type: String,
      enum: ["Active", "Expired", "Not Assigned"],
      default: "Not Assigned",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);

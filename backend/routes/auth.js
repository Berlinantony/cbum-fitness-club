
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();

function requireAdmin(req, res, next) {
  if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET is missing from the environment.");
    return res.status(500).json({
      message: "Server configuration error.",
    });
  }

  const [scheme, token, ...extraParts] = (req.get("authorization") || "")
    .trim()
    .split(/\s+/);

  if (scheme?.toLowerCase() !== "bearer" || !token || extraParts.length > 0) {
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
      message: "A valid authorization token is required.",
    });
  }

  req.authenticatedUserId = payload.id;
  next();
}

router.get("/admin/members", requireAdmin, async (req, res) => {
  try {
    const admin = await User.findById(req.authenticatedUserId).select("role");

    if (!admin || admin.role !== "admin") {
      return res.status(403).json({
        message: "Admin access is required.",
      });
    }

    const [totalMembers, members] = await Promise.all([
      User.countDocuments({ role: "member" }),
      User.find({ role: "member" })
        .select(
          "name email createdAt membershipPlan membershipStartDate membershipExpiryDate membershipStatus"
        )
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    return res.json({ totalMembers, members });
  } catch (error) {
    console.error("Admin member lookup error:", error.message);
    return res.status(500).json({
      message: "Unable to load member accounts.",
    });
  }
});

/* UPDATE A MEMBER */
router.put("/admin/members/:id", requireAdmin, async (req, res) => {
  try {
    const admin = await User.findById(req.authenticatedUserId).select("role");

    if (!admin || admin.role !== "admin") {
      return res.status(403).json({
        message: "Admin access is required.",
      });
    }

    const { id } = req.params;
    const { name, email } = req.body;

    if (!/^[a-f\d]{24}$/i.test(id)) {
      return res.status(400).json({ message: "Invalid member ID." });
    }

    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof email !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ) {
      return res.status(400).json({
        message: "Enter a valid name and email address.",
      });
    }

    const member = await User.findOne({
      _id: id,
      role: "member",
    });

    if (!member) {
      return res.status(404).json({
        message: "Member not found.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({
      email: normalizedEmail,
      _id: { $ne: member._id },
    });

    if (existingUser) {
      return res.status(409).json({
        message: "This email is already in use.",
      });
    }

    member.name = name.trim();
    member.email = normalizedEmail;
    await member.save();

    return res.json({
      message: "Member updated successfully.",
      member: {
        _id: member._id,
        name: member.name,
        email: member.email,
        createdAt: member.createdAt,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "This email is already in use.",
      });
    }

    console.error("Update member error:", error.message);
    return res.status(500).json({
      message: "Unable to update member.",
    });
  }
});

/* DELETE A MEMBER */
router.delete("/admin/members/:id", requireAdmin, async (req, res) => {
  try {
    const admin = await User.findById(req.authenticatedUserId).select("role");

    if (!admin || admin.role !== "admin") {
      return res.status(403).json({
        message: "Admin access is required.",
      });
    }

    const { id } = req.params;

    if (!/^[a-f\d]{24}$/i.test(id)) {
      return res.status(400).json({ message: "Invalid member ID." });
    }

    const member = await User.findOneAndDelete({
      _id: id,
      role: "member",
    });

    if (!member) {
      return res.status(404).json({
        message: "Member not found.",
      });
    }

    return res.json({
      message: "Member deleted successfully.",
    });
  } catch (error) {
    console.error("Delete member error:", error.message);
    return res.status(500).json({
      message: "Unable to delete member.",
    });
  }
});

// Register a new member
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Please fill in all required fields.",
      });
    }

    if (
      typeof email !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ) {
      return res.status(400).json({
        message: "Please enter a valid email address.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must contain at least 8 characters.",
      });
    }

    const existingUser = await User.findOne({
      email: email.toLowerCase().trim(),
    });

    if (existingUser) {
      return res.status(409).json({
        message: "This email is already registered.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    return res.status(201).json({
      message: "Registration successful. You can now log in.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "This email is already registered.",
      });
    }

    console.error("Registration error:", error.message);
    return res.status(500).json({
      message: "Registration failed. Please try again.",
    });
  }
});

// Log in an existing member
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Please enter your email and password.",
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatches) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is missing from the environment.");
      return res.status(500).json({
        message: "Server configuration error.",
      });
    }

    const token = jwt.sign(
      {
        id: user._id.toString(),
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.json({
      message: "Login successful.",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error.message);
    return res.status(500).json({
      message: "Login failed. Please try again.",
    });
  }
});

module.exports = router;

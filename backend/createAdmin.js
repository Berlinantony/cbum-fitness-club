require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");
const databaseName = process.env.MONGO_DB_NAME || "gym_membership_db";

async function createAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!process.env.MONGO_URI || !email || !password) {
    throw new Error(
      "MONGO_URI, ADMIN_EMAIL, and ADMIN_PASSWORD must be set in the environment."
    );
  }

  await mongoose.connect(process.env.MONGO_URI, { dbName: databaseName });

  try {
    const existingAdmin = await User.findOne({ email });
    const hashedPassword = await bcrypt.hash(password, 10);

    if (existingAdmin) {
      existingAdmin.role = "admin";
      existingAdmin.password = hashedPassword;
      await existingAdmin.save();

      console.log("Existing account updated to admin.");
    } else {
      await User.create({
        name: "CBUM Admin",
        email,
        password: hashedPassword,
        role: "admin",
      });

      console.log("Admin account created successfully.");
    }
  } finally {
    await mongoose.disconnect();
  }
}

createAdmin().catch((error) => {
  console.error("Error:", error.message);
  process.exitCode = 1;
});

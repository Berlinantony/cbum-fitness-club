
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const authRoutes = require("./routes/auth");
const membershipRoutes = require("./routes/membership");
const paymentRoutes = require("./routes/payment");
require("dotenv").config();

const app = express();
const databaseName = process.env.MONGO_DB_NAME || "gym_membership_db";

app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/membership", membershipRoutes);
app.use("/api/payments", paymentRoutes);

app.get("/", (req, res) => {
  res.send("Gym Membership Management System API is running!");
});

app.get("/favicon.ico", (req, res) => {
  res.status(204).end();
});

mongoose
  .connect(process.env.MONGO_URI, { dbName: databaseName })
  .then(() => {
    console.log(`MongoDB connected successfully to ${mongoose.connection.name}`);

    app.listen(process.env.PORT || 5000, () => {
      console.log("Server running at http://localhost:5000");
    });
  })
  .catch((error) => {
    console.error("MongoDB connection failed:", error.message);
  });

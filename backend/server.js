const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const authRoutes = require("./routes/auth");
const membershipRoutes = require("./routes/membership");
const paymentRoutes = require("./routes/payment");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });
require("dotenv").config();

const app = express();
const databaseName = process.env.MONGO_DB_NAME || "gym_membership_db";

app.use(cors());
app.use(express.json());

// Support both /api-prefixed and direct routes (important for Vercel rewrites and direct calls)
app.use("/api/auth", authRoutes);
app.use("/auth", authRoutes);

app.use("/api/membership", membershipRoutes);
app.use("/membership", membershipRoutes);

app.use("/api/payments", paymentRoutes);
app.use("/payments", paymentRoutes);

app.get("/", (req, res) => {
  res.send("Gym Membership Management System API is running!");
});

app.get("/api", (req, res) => {
  res.send("Gym Membership Management System API is running!");
});

app.get("/favicon.ico", (req, res) => {
  res.status(204).end();
});

let dbConnectionPromise = null;

async function connectDB() {
  if (mongoose.connection.readyState >= 1) {
    return mongoose.connection;
  }

  if (dbConnectionPromise) {
    return dbConnectionPromise;
  }

  dbConnectionPromise = (async () => {
    const primaryUri = process.env.MONGO_URI;
    const localUri = `mongodb://127.0.0.1:27017/${databaseName}`;

    if (primaryUri) {
      try {
        console.log("Connecting to primary MongoDB URI...");
        await mongoose.connect(primaryUri, {
          dbName: databaseName,
          serverSelectionTimeoutMS: 5000,
        });
        console.log(`MongoDB connected successfully to ${mongoose.connection.name}`);
        return mongoose.connection;
      } catch (error) {
        console.error("Primary MongoDB connection failed:", error.message);
        if (primaryUri.includes("mongodb.net")) {
          console.warn(
            "Hint: Make sure your current IP address is whitelisted in MongoDB Atlas Network Access (or allow 0.0.0.0/0)."
          );
        }
      }
    }

    // Fallback to local MongoDB if primary fails and not in cloud production
    if (!process.env.VERCEL) {
      try {
        console.log(`Attempting connection to local MongoDB (${localUri})...`);
        await mongoose.connect(localUri, {
          serverSelectionTimeoutMS: 3000,
        });
        console.log(`Connected successfully to local MongoDB (${mongoose.connection.name})`);
        return mongoose.connection;
      } catch (fallbackError) {
        console.error("Local MongoDB connection also failed:", fallbackError.message);
      }
    }
  })();

  return dbConnectionPromise;
}

// Middleware to ensure database connection before handling requests on Vercel / serverless
app.use(async (req, res, next) => {
  try {
    await connectDB();
  } catch (err) {
    console.error("DB connection error:", err.message);
  }
  next();
});

// If running as standalone server (local development or Render)
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  connectDB().finally(() => {
    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  });
}

// Export app for Vercel Services Express runner
module.exports = app;

// ✅ server.js (Final, Fully Fixed for Render + Firebase)

import express from "express";
import mongoose from "mongoose";
import multer from "multer";
import path from "path";
import fs from "fs";
import cors from "cors";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

dotenv.config();

// ✅ Setup ES Module paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Initialize Express
const app = express();
app.use(express.json({ limit: "10mb" }));

// ✅ Enable CORS (for Firebase + Localhost + Render)
app.use(
  cors({
    origin: [
      "https://campus-lost-found-c6d88.web.app", // Firebase Hosting
      "http://localhost:3000", // Local development
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  })
);

// ✅ Manual CORS headers (extra safety)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "https://campus-lost-found-c6d88.web.app");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Credentials", "true");
  next();
});

// ✅ Ensure uploads directory exists
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// ✅ Serve uploads folder publicly (IMPORTANT for Render)
app.use("/uploads", express.static(uploadDir));

// ✅ Connect to MongoDB Atlas
mongoose
  .connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 10000, // handle slow networks
  })
  .then(() => console.log("✅ MongoDB Atlas Connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ✅ Define Schema and Model
const itemSchema = new mongoose.Schema({
  item_name: String,
  description: String,
  location: String,
  contact_number: String,
  type: String, // 'lost' or 'found'
  image_url: String,
  reported_at: { type: Date, default: Date.now },
});

const Item = mongoose.model("Item", itemSchema);

// ✅ Multer setup for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});
const upload = multer({ storage });

// ✅ POST: Report an item
app.post("/api/items", upload.single("image"), async (req, res) => {
  try {
    const { item_name, description, location, contact_number, type } = req.body;

    const baseUrl =
      process.env.RENDER_EXTERNAL_URL || "https://lost-found-backend-lrjz.onrender.com";
    const imageUrl = req.file ? `${baseUrl}/uploads/${req.file.filename}` : null;

    const newItem = new Item({
      item_name,
      description,
      location,
      contact_number,
      type,
      image_url: imageUrl,
    });

    await newItem.save();
    res.status(201).json({ message: "✅ Item saved successfully", item: newItem });
  } catch (err) {
    console.error("❌ Error saving item:", err);
    res.status(500).json({ error: "Failed to save item" });
  }
});

// ✅ GET: Fetch all items
app.get("/api/items", async (req, res) => {
  try {
    const items = await Item.find().sort({ reported_at: -1 });
    res.json(items);
  } catch (err) {
    console.error("❌ Error fetching items:", err);
    res.status(500).json({ error: "Failed to fetch items" });
  }
});

// ✅ DELETE: Remove an item by ID
app.delete("/api/items/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await Item.findByIdAndDelete(id);
    res.json({ message: "🗑️ Item deleted successfully" });
  } catch (err) {
    console.error("❌ Error deleting item:", err);
    res.status(500).json({ error: "Failed to delete item" });
  }
});

// ✅ Health check routes
app.get("/api/health", (req, res) => res.json({ status: "ok" }));
app.get("/", (req, res) => {
  res.send("🚀 Lost & Found API is running successfully!");
});

// ✅ Error handler for invalid JSON
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && "body" in err) {
    return res.status(400).send({ error: "Invalid JSON format" });
  }
  next();
});

// ✅ Dynamic port for Render
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

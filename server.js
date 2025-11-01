import express from "express";
import mongoose from "mongoose";
import multer from "multer";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
dotenv.config();


// ✅ Setup file paths (for ES Modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Initialize Express
const app = express();
app.use(express.json({ limit: "10mb" }));

// ✅ Setup CORS (adjust origin if needed)
app.use(
  cors({
    origin: "http://localhost:3000", // <-- change this if your frontend runs elsewhere
    methods: ["GET", "POST"],
    credentials: true,
  })
);

// ✅ Ensure uploads directory exists
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// ✅ Serve uploads folder publicly
app.use("/uploads", express.static(uploadDir));

// ✅ Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
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

// ✅ Setup Multer (file upload)
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

    const imageUrl = req.file
      ? `http://localhost:5000/uploads/${req.file.filename}`
      : null;

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

// ✅ Root route (for health check)
app.get("/", (req, res) => {
  res.send("🚀 Lost & Found API is running");
});

// ✅ Error handler for invalid JSON
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && "body" in err) {
    return res.status(400).send({ error: "Invalid JSON" });
  }
  next();
});

// ✅ DELETE route — Remove an item by ID
app.delete("/api/items/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await Item.findByIdAndDelete(id);
    res.json({ message: "Item deleted successfully" });
  } catch (err) {
    console.error("Error deleting item:", err);
    res.status(500).json({ error: "Failed to delete item" });
  }
});

// ✅ Start the server
const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

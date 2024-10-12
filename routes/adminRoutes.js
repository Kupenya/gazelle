import express from "express";
import uploadConfig from "../utils/upload.config.js";
const { upload, uploadToCloudinary } = uploadConfig;
const router = express.Router();

import {
  postProduct,
  registerAdmin,
  updateProduct,
  deleteProduct,
  getAdminProducts,
  getAllProducts,
} from "../controllers/adminController.js";
import { adminOnly, protect } from "../middleware/authMiddleware.js";

// Register a new Admin
router.post("/", registerAdmin);

//post a new product
router.post(
  "/products",
  protect,
  adminOnly,
  upload.array("images", 3),
  uploadToCloudinary,
  postProduct
);

// Get all products
router.get("/products", getAllProducts);

// Get products posted by a particular admin
router.get("/adminProducts", protect, adminOnly, getAdminProducts);

// Update a product
router.put(
  "/products/:id",
  protect,
  adminOnly,
  upload.array("images", 3),
  uploadToCloudinary,
  updateProduct
);

// Delete a product
router.delete("/products/:id", protect, adminOnly, deleteProduct);

export default router;

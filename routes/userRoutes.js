import express from "express";
import {
  authUserOrAdmin,
  registerUser,
  logoutUser,
  addToCart,
  getCart,
  updateCartItem,
  removeCartItem,
  clearCart,
} from "../controllers/userController.js";

import { protect, userOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

// auth
router.post("/", registerUser);
router.post("/auth", authUserOrAdmin);
router.post("/logout", logoutUser);

// cart
router.post("/cart", protect, userOnly, addToCart);
router.get("/cart", protect, userOnly, getCart);
router.put("/cart", protect, userOnly, updateCartItem);
router.delete("/cart/remove/:productId", protect, userOnly, removeCartItem);
router.delete("/cart/clear", protect, userOnly, clearCart);

export default router;

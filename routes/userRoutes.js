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
router.post("/cart", addToCart);
router.get("/cart", getCart);
router.put("/cart", updateCartItem);
router.delete("/cart/remove/:productId", removeCartItem);
router.delete("/cart/clear", clearCart);

export default router;

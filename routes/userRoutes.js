import express from "express";
import {
  authUserOrAdmin,
  registerUser,
  logoutUser,
  addToCartForAuthenticatedUser,
  addToCartForUnauthenticatedUser,
  getCartForAuthenticatedUser,
  getCartForUnauthenticatedUser,
  removeCartItem,
  clearCart,
  checkout,
  updateUnauthCartItem,
  updateAuthCartItem,
  handlePaystackCallback,
  getUserOrders,
  getGuestOrders,
  getOrderDetails,
  cancelOrder,
  updateOrderStatus,
} from "../controllers/userController.js";

import { protect, userOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

// auth
router.post("/", registerUser);
router.post("/auth", authUserOrAdmin);
router.post("/logout", logoutUser);

// cart
// routes.js
router.post("/a/add-to-cart", protect, addToCartForAuthenticatedUser);
router.post("/u/add-to-cart", addToCartForUnauthenticatedUser);
// Route for authenticated users
router.get("/cart", protect, getCartForAuthenticatedUser);

// Route for unauthenticated users
router.get("/gcart",  getCartForUnauthenticatedUser);
router.put("/cart/", protect, updateAuthCartItem);
router.put("/cart/:cartId", updateUnauthCartItem);

router.delete("/cart/remove/:productId", protect, removeCartItem);
router.delete("/cart/clear", clearCart);

// Checkout route for placing an order
router.post("/checkout", protect, checkout);
// router.post("/gcheckout", checkoutForUnauthenticatedUser);

router.get("/payment/callback/:orderId", handlePaystackCallback);
router.get("/order/success/:orderId", (req, res) => {
  res.send("Payment successful, order placed successfully!");
});
router.get("/order/failure/:orderId", (req, res) => {
  res.send("Payment failed, please try again.");
});

// Route for authenticated users to get their orders
router.get("/orders", protect, getUserOrders);

// Route for guest users to get their orders (no protection middleware required)
router.get("/orders/guest", getGuestOrders);

// View order details (protected for authenticated users or accessible for guests with session)
router.get("/orders/:orderId", protect, getOrderDetails);

// Cancel an order (protected for authenticated users or accessible for guests with session)
router.put("/orders/:orderId/cancel", protect, cancelOrder);

export default router;

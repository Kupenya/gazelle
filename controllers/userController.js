import asyncHandler from "express-async-handler";
import User from "../models/userModel.js";
import generateToken from "../utils/generateToken.js";
import Admin from "../models/adminModel.js";
import Product from "../models/productSchema.js";
import Cart from "../models/cart.js";
import Order from "../models/order.js";
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

// @desc    Auth user or admin / set token
// @route   POST /api/auth
// @access  Public
const authUserOrAdmin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Check if email and password are provided
  if (!email || !password) {
    res.status(400);
    throw new Error("Please provide both email and password");
  }

  const normalizedEmail = email.toLowerCase();

  // Search by email if it's an email,
  const user = await User.findOne({ email: normalizedEmail });

  if (user && (await user.matchPassword(password))) {
    // If user found and password matches
    const token = generateToken(user._id);
    res.status(200).json({
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      userState: user.userState,
      isAdmin: user.isAdmin,
      token,
    });
  } else {
    // Check in Admin collection if not found in User collection
    const admin = await Admin.findOne({ email: normalizedEmail });

    if (admin && (await admin.matchPassword(password))) {
      const token = generateToken(admin._id);
      res.status(200).json({
        _id: admin._id,
        firstName: admin.firstName,
        lastName: admin.lastName,
        email: admin.email,
        adminState: admin.adminState,
        isAdmin: true,
        token,
      });
    } else {
      res.status(401);
      throw new Error("Invalid email/phone number or password");
    }
  }
});

// @desc    Register a new user
// @route   POST /api/users
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, password, userState, isAdmin } = req.body;

  // Validate input
  if (!email) {
    res.status(400);
    throw new Error("Please provide an email");
  }

  // Clean and validate email
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const cleanedEmail =
    email?.trim() === "" ? null : email?.toLowerCase().trim();
  if (cleanedEmail && !emailRegex.test(cleanedEmail)) {
    res.status(400);
    throw new Error("Invalid email address");
  }

  try {
    // Check for existing user
    const queryConditions = [];
    if (cleanedEmail !== null && cleanedEmail !== "") {
      queryConditions.push({ email: cleanedEmail });
    }

    const existingUser = await User.findOne({
      $or: queryConditions,
    });

    if (existingUser) {
      res.status(409).json({
        message: "User already exists with this email",
      });
    } else {
      // Create new user
      const newUser = {
        firstName,
        lastName,
        email: cleanedEmail,
        userState,
        password,
        isAdmin,
      };
      const user = await User.create(newUser);

      // Respond with user details
      if (user) {
        res.status(201).json({
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          userState: user.userState,
          isAdmin: user.isAdmin,
        });
      } else {
        res.status(500).json({ message: "Failed to create user" });
      }
    }
  } catch (error) {
    console.error("Registration Error:", error);
    res
      .status(500)
      .json({ message: "An error occurred while registering user" });
  }
});

//@desc    Logout user
//route    POST /api/users/logout
//@access  Public
const logoutUser = asyncHandler(async (req, res) => {
  res.status(200).json({ message: "User logged out" }); // the logout should should be handleed by the frontend where we are destroying the token and clearing from local storage or whereever the FE is saving the token
});

//@desc    Add item to cart
//@route   POST /api/cart/add
//@access  Public & auth

// Add item to cart
// userController.js
export const addToCartForAuthenticatedUser = asyncHandler(async (req, res) => {
  const { productId, quantity, size, color } = req.body;
  const userId = req.user._id;

  // Find or create user's cart
  let cart = await Cart.findOne({ userId });
  if (!cart) {
    cart = new Cart({ userId, items: [] });
  }

  // Check if the product with specific attributes is already in the cart
  const existingCartItem = cart.items.find(
    (item) =>
      item.productId.toString() === productId &&
      item.size === size &&
      item.color === color
  );

  if (existingCartItem) {
    // Update quantity if item already exists in the cart
    existingCartItem.quantity += quantity;
    existingCartItem.totalPrice =
      existingCartItem.price * existingCartItem.quantity;
  } else {
    // Add new item to the cart with all details
    const product = await Product.findById(productId);
    const totalPrice = product.price * quantity;
    cart.items.push({
      productId,
      quantity,
      price: product.price,
      size,
      color,
      name: product.name,
      images: product.images[0],
      totalPrice,
    });
  }

  // Save the updated cart
  const updatedCart = await cart.save();
  return res
    .status(200)
    .json({ message: "Item added to cart", cart: updatedCart });
});

export const addToCartForUnauthenticatedUser = asyncHandler(
  async (req, res) => {
    const { productId, quantity, size, color } = req.body;

    // Check if the product exists in the database
    const product = await Product.findById(productId);
    if (!product) {
      res.status(404);
      throw new Error("Product not found");
    }

    // Calculate the total price based on the quantity
    const totalPrice = product.price * quantity;

    // Unauthenticated users (store in session)
    if (!req.session.cart) {
      req.session.cart = [];
    }

    // Check if the item already exists in the session cart
    const existingSessionItem = req.session.cart.find(
      (item) =>
        item.productId === productId &&
        item.size === size &&
        item.color === color
    );

    if (existingSessionItem) {
      // Update quantity for existing item
      existingSessionItem.quantity += quantity;
    } else {
      // Add new item to session cart
      req.session.cart.push({
        productId,
        quantity,
        price: product.price,
        size,
        color,
        name: product.name,
        images: product.images[0],
        totalPrice,
      });
    }

    return res
      .status(200)
      .json({ message: "Item added to session cart", cart: req.session.cart });
  }
);

//@desc    Get user's cart
//@route   GET /api/cart
//@access  Private (Admin only)
export const getCartForAuthenticatedUser = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // Find the user's cart and populate product details
  const cart = await Cart.findOne({ userId }).populate("items.productId");
  const cartItems = cart ? cart.items : [];
  const cartTotal = cartItems.reduce(
    (total, item) => total + item.totalPrice,
    0
  );

  res.status(200).json({
    items: cartItems,
    totalAmount: cartTotal,
    itemCount: cartItems.length,
  });
});
export const getCartForUnauthenticatedUser = asyncHandler(async (req, res) => {
  // Initialize session cart if it doesn’t exist
  if (!req.session.cart) {
    req.session.cart = [];
  }

  // Create a guestId if it doesn’t exist
  if (!req.session.guestId) {
    req.session.guestId = generateGuestId();
  }

  const cartItems = req.session.cart;
  const cartTotal = cartItems.reduce(
    (total, item) => total + item.totalPrice,
    0
  );

  res.status(200).json({
    items: cartItems,
    totalAmount: cartTotal,
    itemCount: cartItems.length,
    guestId: req.session.guestId,
  });
});

//@desc    Update cart item quantity
//@route   PUT /api/cart/update
//@access  Private/Public (Both authenticated and unauthenticated users)
export const updateAuthCartItem = asyncHandler(async (req, res) => {
  const { productId, quantity } = req.body;

  // Log incoming request data for debugging
  console.log("Request Body:", { productId, quantity });

  // Validate the quantity
  if (quantity < 1) {
    res.status(400);
    throw new Error("Quantity must be at least 1");
  }

  // If the user is authenticated, get userId from the request
  const userId = req.user._id;
  console.log("User ID:", userId);

  // Find the user's cart and populate the items.productId field
  const cart = await Cart.findOne({ userId }).populate("items.productId");
  console.log("Found Cart:", JSON.stringify(cart, null, 2));

  if (!cart) {
    res.status(404);
    throw new Error("Cart not found");
  }

  // Log cart items for debugging
  console.log(
    "Cart Items:",
    cart.items.map((item) => ({
      itemProductId: item.productId?._id.toString(), // Use _id to match productId
      requestedProductId: productId,
      isMatch: item.productId?._id.toString() === productId, // Compare the _id of product
    }))
  );

  // Find the cart item based on productId
  const cartItem = cart.items.find((item) => {
    const itemProductId = item.productId?._id.toString(); // Ensure the productId is compared correctly
    const requestedId = productId.toString(); // Ensure productId is a string
    console.log("Comparing:", {
      itemProductId,
      requestedId,
      isMatch: itemProductId === requestedId,
    });
    return itemProductId === requestedId;
  });

  // Log the cart item found
  console.log("Found Cart Item:", cartItem);

  if (!cartItem) {
    res.status(404);
    throw new Error("Product not found in cart");
  }

  // Update the quantity of the cart item
  const oldQuantity = cartItem.quantity;
  cartItem.quantity = quantity;

  console.log("Updated Cart Item:", {
    productId: cartItem.productId._id,
    oldQuantity,
    newQuantity: quantity,
  });

  // Save the updated cart to the database
  const updatedCart = await cart.save();

  console.log("Saved Updated Cart:", JSON.stringify(updatedCart, null, 2));

  // Send the response with the updated cart
  res.status(200).json({
    message: "Cart item updated",
    cart: updatedCart,
  });
});

export const updateUnauthCartItem = asyncHandler(async (req, res) => {
  // For unauthenticated users, update cart stored in the session
  if (!req.session.cart) {
    return res.status(404).json({ message: "Cart not found" });
  }

  // Find the cart item in the session cart
  const cartItem = req.session.cart.find(
    (item) => item.productId === productId
  );

  if (!cartItem) {
    return res.status(404).json({ message: "Product not found in cart" });
  }

  // Update the quantity
  cartItem.quantity = quantity;

  // Update the session cart
  req.session.cart = req.session.cart.map((item) =>
    item.productId === productId ? { ...item, quantity } : item
  );

  res
    .status(200)
    .json({ message: "Cart item updated", cart: req.session.cart });
});

//@desc    Remove item from cart
//@route   DELETE /api/cart/remove/:productId
//@access  Private/Public (Both authenticated and unauthenticated users)
const removeCartItem = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  if (req.user) {
    // If the user is authenticated
    const userId = req.user._id;

    // Find the user's cart
    const cart = await Cart.findOne({ userId });

    if (!cart) {
      res.status(404);
      throw new Error("Cart not found");
    }

    // Find the item in the cart
    const itemIndex = cart.items.findIndex(
      (item) => item.productId.toString() === productId
    );

    if (itemIndex === -1) {
      res.status(404);
      throw new Error("Product not found in cart");
    }

    // Remove the item from the cart
    cart.items.splice(itemIndex, 1);

    // Save the cart
    const updatedCart = await cart.save();

    res
      .status(200)
      .json({ message: "Item removed from cart", cart: updatedCart });
  } else {
    // For unauthenticated users, handle session cart
    if (!req.session.cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    // Find the item in the session cart
    const itemIndex = req.session.cart.findIndex(
      (item) => item.productId === productId
    );

    if (itemIndex === -1) {
      return res.status(404).json({ message: "Product not found in cart" });
    }

    // Remove the item from the session cart
    req.session.cart.splice(itemIndex, 1);

    // If the cart is empty after removing the item, clear the session cart
    if (req.session.cart.length === 0) {
      req.session.cart = null;
    }

    res.status(200).json({
      message: "Item removed from cart",
      cart: req.session.cart || [],
    });
  }
});

//@desc    Clear user's cart
//@route   DELETE /api/cart/clear
//@access  Private/Public (Both authenticated and unauthenticated users)
const clearCart = asyncHandler(async (req, res) => {
  if (req.user) {
    // For authenticated users
    const userId = req.user._id;

    // Find the user's cart
    const cart = await Cart.findOne({ userId });

    if (!cart) {
      return res
        .status(200)
        .json({ message: "Cart is already empty", cart: { items: [] } });
    }

    // Clear all items
    cart.items = [];

    // Save the cleared cart
    const updatedCart = await cart.save();

    res.status(200).json({ message: "Cart cleared", cart: updatedCart });
  } else {
    // For unauthenticated users (session cart)
    if (!req.session.cart || req.session.cart.length === 0) {
      return res
        .status(200)
        .json({ message: "Cart is already empty", cart: { items: [] } });
    }

    // Clear the session cart
    req.session.cart = null;

    res.status(200).json({ message: "Cart cleared", cart: { items: [] } });
  }
});

const PAYSTACK_API_URL = "https://api.paystack.co";
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

// Helper function to generate a guest user ID
const generateGuestId = () => {
  return `guest-${Math.random().toString(36).substr(2, 9)}`;
};

// Checkout and Order Creation
export const checkout = asyncHandler(async (req, res) => {
  try {
    const { shippingAddress } = req.body;
    let items;
    let totalAmount;

    // Fetch cart items based on authentication status
    if (req.user) {
      // For authenticated users, get cart from database
      const cart = await Cart.findOne({ userId: req.user._id });
      if (!cart || !cart.items || cart.items.length === 0) {
        return res.status(400).json({ message: "Cart is empty" });
      }
      items = cart.items;
      totalAmount = items.reduce((total, item) => {
        const itemTotalPrice = parseFloat(item.totalPrice);
        return !isNaN(itemTotalPrice) ? total + itemTotalPrice : total;
      }, 0);
    } else {
      // For unauthenticated users, get cart from session
      if (!req.session.cart || req.session.cart.length === 0) {
        return res.status(400).json({ message: "Cart is empty" });
      }
      items = req.session.cart;
      totalAmount = items.reduce((total, item) => total + item.totalPrice, 0);
    }

    let userId = req.user ? req.user._id : null;
    let guestId = req.user ? null : req.session.guestId || generateGuestId();

    // Save guestId to session if not authenticated
    if (!req.user) {
      req.session.guestId = guestId;
    }

    const orderData = {
      items,
      totalAmount,
      shippingAddress,
      paymentMethod: "paystack",
      orderStatus: "pending",
      paymentStatus: "pending",
    };

    if (userId) {
      orderData.userId = userId;
    } else if (guestId) {
      orderData.guestId = guestId;
    }

    const order = new Order(orderData);
    await order.save();

    // Clear the cart after successful order creation
    if (req.user) {
      await Cart.findOneAndUpdate(
        { userId: req.user._id },
        { $set: { items: [] } }
      );
    } else {
      req.session.cart = [];
    }

    const paymentResponse = await initializePayment(
      totalAmount,
      req.user ? req.user.email : `${guestId}@guest.example.com`,
      `http://localhost:5000/api/users/payment/callback/${order._id}`
    );

    res.status(200).json({
      message: "Checkout successful. Please complete payment.",
      paymentUrl: paymentResponse.authorization_url,
      orderReference: paymentResponse.reference,
      orderId: order._id,
    });
  } catch (error) {
    console.error("Error during checkout:", error);
    res.status(500).json({ message: "Server error during checkout" });
  }
});

// Payment Initialization
const initializePayment = async (amount, email, callbackUrl) => {
  try {
    const paymentData = {
      email,
      amount: amount * 100, // Amount in kobo (100 kobo = 1 NGN)
      currency: "NGN",
      callback_url: callbackUrl,
    };

    const response = await axios.post(
      `${PAYSTACK_API_URL}/transaction/initialize`,
      paymentData,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    // Check if the response data structure indicates success
    if (response.data && response.data.status === true) {
      return {
        authorization_url: response.data.data.authorization_url, // Redirect URL to Paystack
        reference: response.data.data.reference, // Unique reference for tracking
      };
    } else {
      throw new Error(
        "Payment initialization failed - Paystack returned an error"
      );
    }
  } catch (error) {
    console.error("Error initializing payment with Paystack:", error);
    throw error;
  }
};

// Handle Paystack Callback
export const handlePaystackCallback = asyncHandler(async (req, res) => {
  const { orderId } = req.params;

  try {
    const paymentVerificationResponse = await axios.get(
      `${PAYSTACK_API_URL}/transaction/verify/${req.query.reference}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    const paymentData = paymentVerificationResponse.data.data;

    if (paymentData.status === "success") {
      const order = await Order.findById(orderId);
      order.paymentStatus = "paid";
      order.orderStatus = "processing";
      await order.save();

      res.redirect(`http://localhost:5000/api/users/order/success/${orderId}`);
    } else {
      res.redirect(`http://localhost:5000/api/users/order/failure/${orderId}`);
    }
  } catch (error) {
    console.error("Error verifying payment:", error);
    res.status(500).json({ message: "Payment verification failed" });
  }
});

// Update Order Status
export const updateOrderStatus = asyncHandler(async () => {
  try {
    const ordersToShip = await Order.find({
      orderStatus: "processing",
      paymentStatus: "paid",
    });

    for (const order of ordersToShip) {
      order.orderStatus = "shipped";
      await order.save();
      console.log(`Order ${order._id} has been shipped.`);
    }

    const ordersToDeliver = await Order.find({
      orderStatus: "shipped",
      paymentStatus: "paid",
    });

    for (const order of ordersToDeliver) {
      const now = new Date();
      const shippedAt = new Date(order.createdAt);

      if (now - shippedAt >= 3 * 24 * 60 * 60 * 1000) {
        order.orderStatus = "delivered";
        await order.save();
        console.log(`Order ${order._id} has been delivered.`);
      }
    }
  } catch (error) {
    console.error("Error during order status update:", error);
  }
});

// Get orders for authenticated users
export const getUserOrders = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id; // Retrieve the authenticated user's ID
    const orders = await Order.find({ userId });
    res.status(200).json(orders);
  } catch (error) {
    console.error("Error fetching user orders:", error);
    res.status(500).json({ message: "Error fetching user orders" });
  }
});

// Get orders for guest users
export const getGuestOrders = asyncHandler(async (req, res) => {
  try {
    const guestId = req.session.guestId; // Retrieve guest ID from session

    if (!guestId) {
      return res.status(400).json({ message: "Guest ID not found in session" });
    }

    const orders = await Order.find({ guestId });
    res.status(200).json(orders);
  } catch (error) {
    console.error("Error fetching guest orders:", error);
    res.status(500).json({ message: "Error fetching guest orders" });
  }
});

// View Order Details by Order ID
export const getOrderDetails = asyncHandler(async (req, res) => {
  const { orderId } = req.params;

  try {
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Ensure the user has permission to view this order (authenticated user or guest)
    if (
      req.user?._id.equals(order.userId) ||
      req.session.guestId === order.guestId
    ) {
      return res.status(200).json(order);
    } else {
      return res
        .status(403)
        .json({ message: "Unauthorized access to this order" });
    }
  } catch (error) {
    console.error("Error fetching order details:", error);
    res.status(500).json({ message: "Error fetching order details" });
  }
});

// Cancel Order by Order ID
export const cancelOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.params;

  try {
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Ensure the user has permission to cancel this order
    if (
      req.user?._id.equals(order.userId) ||
      req.session.guestId === order.guestId
    ) {
      if (order.orderStatus === "pending") {
        order.orderStatus = "cancelled";
        await order.save();
        return res
          .status(200)
          .json({ message: "Order cancelled successfully" });
      } else {
        return res
          .status(400)
          .json({ message: "Order cannot be cancelled at this stage" });
      }
    } else {
      return res
        .status(403)
        .json({ message: "Unauthorized access to cancel this order" });
    }
  } catch (error) {
    console.error("Error cancelling order:", error);
    res.status(500).json({ message: "Error cancelling order" });
  }
});

// const PAYSTACK_API_URL = "https://api.paystack.co";
// const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

// // Payment Initialization (Backend route)
// export const initializePayment = async (req, res) => {
//   const { amount, email, callbackUrl } = req.body; // Extract payment details from request body

//   try {
//     // Prepare the data to send to Paystack
//     const paymentData = {
//       email,
//       amount: amount * 100, // Amount is expected in kobo (100 kobo = 1 NGN)
//       currency: "NGN", // Change this based on your preferred currency
//       callback_url: callbackUrl, // Redirect URL after payment
//     };

//     // Make a POST request to Paystack's initialization endpoint
//     const response = await axios.post(
//       `${PAYSTACK_API_URL}/transaction/initialize`,
//       paymentData,
//       {
//         headers: {
//           Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
//         },
//       }
//     );

//     const { data } = response;

//     if (data.status === "success") {
//       // Send the URL to the frontend for redirection to Paystack
//       res.status(200).json({
//         status: "success",
//         authorization_url: data.data.authorization_url, // Redirect the user to this URL
//         reference: data.data.reference, // Unique reference for tracking
//       });
//     } else {
//       res.status(500).json({
//         status: "failed",
//         message: "Payment initialization failed.",
//       });
//     }
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({
//       status: "failed",
//       message: error.message,
//     });
//   }
// };

export { authUserOrAdmin, registerUser, logoutUser, removeCartItem, clearCart };

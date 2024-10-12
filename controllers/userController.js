import asyncHandler from "express-async-handler";
import User from "../models/userModel.js";
import generateToken from "../utils/generateToken.js";
import Admin from "../models/adminModel.js";
import Product from "../models/productSchema.js";
import Cart from "../models/cart.js";

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
//@access  Private (Admin only)
const addToCart = asyncHandler(async (req, res) => {
  const { productId, quantity } = req.body;

  // Check if the product exists
  const product = await Product.findById(productId);
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  // If user is authenticated
  if (req.user) {
    const userId = req.user._id;

    // Find the user's cart or create a new one if it doesn't exist
    let cart = await Cart.findOne({ userId });

    if (!cart) {
      cart = new Cart({ userId, items: [] });
    }

    // Check if the product is already in the cart
    const existingCartItem = cart.items.find(
      (item) => item.productId.toString() === productId
    );

    if (existingCartItem) {
      existingCartItem.quantity += quantity;
    } else {
      // Add new item to the cart
      cart.items.push({ productId, quantity });
    }

    // Save the cart
    const updatedCart = await cart.save();

    return res
      .status(200)
      .json({ message: "Item added to cart", cart: updatedCart });
  } else {
    // If the user is not authenticated, store in session
    if (!req.session.cart) {
      req.session.cart = [];
    }

    // Check if the product is already in the session cart
    const existingSessionItem = req.session.cart.find(
      (item) => item.productId === productId
    );

    if (existingSessionItem) {
      existingSessionItem.quantity += quantity;
    } else {
      // Add new item to the session cart
      req.session.cart.push({ productId, quantity });
    }

    return res
      .status(200)
      .json({ message: "Item added to session cart", cart: req.session.cart });
  }
});

//@desc    Get user's cart
//@route   GET /api/cart
//@access  Private (Admin only)
const getCart = asyncHandler(async (req, res) => {
  // Check if the user is authenticated
  if (req.user) {
    const userId = req.user._id;

    // Find the user's cart and populate the product details
    const cart = await Cart.findOne({ userId }).populate("items.productId");

    if (!cart) {
      return res.status(200).json({ items: [] }); // Return an empty array if no cart exists
    }

    res.status(200).json(cart);
  } else {
    // For unauthenticated users, check the session cart
    if (!req.session.cart || req.session.cart.length === 0) {
      return res.status(200).json({ items: [] }); // Return an empty array if session cart doesn't exist
    }

    // Return the session cart for unauthenticated users
    res.status(200).json({ items: req.session.cart });
  }
});

//@desc    Update cart item quantity
//@route   PUT /api/cart/update
//@access  Private/Public (Both authenticated and unauthenticated users)
const updateCartItem = asyncHandler(async (req, res) => {
  const { productId, quantity } = req.body;

  // Validate the quantity
  if (quantity < 1) {
    res.status(400);
    throw new Error("Quantity must be at least 1");
  }

  if (req.user) {
    // If the user is authenticated
    const userId = req.user._id;

    // Find the user's cart
    const cart = await Cart.findOne({ userId });

    if (!cart) {
      res.status(404);
      throw new Error("Cart not found");
    }

    // Find the cart item
    const cartItem = cart.items.find(
      (item) => item.productId.toString() === productId
    );

    if (!cartItem) {
      res.status(404);
      throw new Error("Product not found in cart");
    }

    // Update the quantity
    cartItem.quantity = quantity;

    // Save the cart
    const updatedCart = await cart.save();

    res.status(200).json({ message: "Cart item updated", cart: updatedCart });
  } else {
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
  }
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

    res
      .status(200)
      .json({
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

export {
  authUserOrAdmin,
  registerUser,
  logoutUser,
  getUserProfile,
  updateUserProfile,
  addToCart,
  getCart,
  updateCartItem,
  removeCartItem,
  clearCart,
};

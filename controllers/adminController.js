import Admin from "../models/adminModel.js";
import asyncHandler from "express-async-handler";
import Product from "../models/productSchema.js";
import Order from "../models/order.js";

// @desc    Register a new admin
// @route   POST /api/admin
// @access  Public
const registerAdmin = asyncHandler(async (req, res) => {
  const { email, firstName, lastName, adminState, password, isAdmin } =
    req.body;

  // Validate input
  if (!email) {
    res.status(400);
    throw new Error("Please provide email");
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
    // Check for existing admin
    const queryConditions = [];
    if (cleanedEmail !== null && cleanedEmail !== "") {
      queryConditions.push({ email: cleanedEmail });
    }

    const existingAdmin = await Admin.findOne({
      $or: queryConditions,
    });

    if (existingAdmin) {
      res.status(409).json({
        message: "Admin already exists with this email",
      });
    } else {
      // Create new Admin
      const newAdmin = {
        firstName,
        lastName,
        adminState,
        password,
        isAdmin,
      };
      if (cleanedEmail !== null) {
        newAdmin.email = cleanedEmail;
      }

      const admin = await Admin.create(newAdmin);

      // Respond with admin details
      if (admin) {
        res.status(201).json({
          _id: admin._id,
          firstName: admin.firstName,
          lastName: admin.lastName,
          email: admin.email,
          adminState: admin.adminState,
          isAdmin: admin.isAdmin,
        });
      } else {
        res.status(500).json({ message: "Failed to create admin" });
      }
    }
  } catch (error) {
    console.error("Registration Error:", error);
    res
      .status(500)
      .json({ message: "An error occurred while registering admin" });
  }
});

// @desc    Post a new product by an admin
// @route   POST /api/admin/products
// @access  Private (Admin only)
const postProduct = asyncHandler(async (req, res) => {
  console.log("Req Files:", req.files);

  const { name, quantity, price, sizes, colors, description, images } =
    req.body;

  // Calculate availability based on quantity
  const availability = quantity > 0 ? "Available" : "Unavailable";

  // Create new product
  try {
    const product = await Product.create({
      admin: req.user._id,
      name,
      quantity,
      availability,
      price,
      sizes,
      colors,
      description,
      images,
    });
    res.status(201).json({
      message: "Product created successfully",
      product,
    });
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(500).json({ message: "Error creating product" });
  }
});

// @desc    Update a product
// @route   PUT /api/admin/products/:id
// @access  Private (Admin only)
const updateProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, quantity, price, sizes, colors, description, images } =
    req.body;

  // Check if user is authenticated
  if (!req.user) {
    res.status(401);
    throw new Error("Please authenticate");
  }

  const admin = await Admin.findById(req.user._id);

  if (!admin) {
    res.status(401);
    throw new Error("Admin not authorized");
  }

  // Find the product
  const product = await Product.findById(id);

  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  // Check if the current admin owns the product
  if (!product.admin.equals(req.user._id)) {
    res.status(403);
    throw new Error("Not authorized to update this product");
  }

  // Update product details
  product.name = name || product.name;
  product.quantity = quantity || product.quantity;
  product.availability = product.quantity > 0 ? "Available" : "Unavailable";
  product.price = price || product.price;
  product.sizes = sizes || product.sizes;
  product.colors = colors || product.colors;
  product.description = description || product.description;
  product.images = images || product.images;

  try {
    const updatedProduct = await product.save();
    res.status(200).json(updatedProduct);
  } catch (error) {
    console.error("Update Product Error:", error);
    res
      .status(500)
      .json({ message: "Failed to update product", error: error.message });
  }
});

// @desc    Delete a product
// @route   DELETE /api/admins/products/:id
// @access  Private (Admin only)
const deleteProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const admin = await Admin.findById(req.user._id);

  if (!admin) {
    res.status(401);
    throw new Error("Admin not authorized");
  }

  // Find the product
  const product = await Product.findById(id);

  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  // Check if the current admin owns the product
  if (!product.admin.equals(req.user._id)) {
    res.status(403);
    throw new Error("Not authorized to delete this product");
  }

  // Use deleteOne() to remove the product
  await Product.deleteOne({ _id: id });

  res.status(200).json({ message: "Product removed" });
});

// @desc    Get all products
// @route   GET /api/products
// @access  Public
const getAllProducts = asyncHandler(async (req, res) => {
  const products = await Product.find({}).select(
    "name quantity price sizes colors description images"
  );

  if (products.length > 0) {
    res.status(200).json(products);
  } else {
    res.status(404);
    throw new Error("No products found");
  }
});

// @desc    Get products posted by a particular admin
// @route   GET /api/admins/products
// @access  Private (Admin only)
const getAdminProducts = asyncHandler(async (req, res) => {
  const admin = await Admin.findById(req.user._id);

  if (!admin) {
    res.status(401);
    throw new Error("Admin not authorized");
  }

  const products = await Product.find({ admin: req.user._id }).select(
    "name quantity price sizes colors description images"
  );

  if (products.length > 0) {
    res.status(200).json(products);
  } else {
    res.status(404);
    throw new Error("No products found for this admin");
  }
});

// 3.1 View All Orders with Filters
export const getAllOrders = asyncHandler(async (req, res) => {
  const { status, user, date, page = 1, limit = 10 } = req.query;

  let filter = {};
  if (status) filter.orderStatus = status;
  if (user) filter.userId = user;
  if (date) filter.createdAt = { $gte: new Date(date) };

  const orders = await Order.find(filter)
    .populate("userId", "name email") // Include user details
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  res.json({ orders, page, totalOrders: await Order.countDocuments(filter) });
});

// 3.2 View Order Details by Order ID
export const getOrderById = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const order = await Order.findById(orderId).populate("userId", "name email");

  if (order) {
    res.json(order);
  } else {
    res.status(404).json({ message: "Order not found" });
  }
});

// 3.3 Update Order Status
export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { orderStatus } = req.body;

  if (
    !["pending", "processing", "shipped", "delivered", "cancelled"].includes(
      orderStatus
    )
  ) {
    console.log(`Received status: '${orderStatus}'`); // Log with quotes to detect any extra spaces

    return res.status(400).json({ message: "Invalid status value" });
  }

  const order = await Order.findById(orderId);
  if (order) {
    console.log("Current Order Status:", order.orderStatus); // Log the current status

    // Explicitly set the orderStatus field
    order.orderStatus = orderStatus;

    console.log("Updated Order Status:", order.orderStatus); // Log the new status

    await order.save(); // Save the updated order

    // Return the updated order
    res.json({ message: "Order status updated", order });
  } else {
    res.status(404).json({ message: "Order not found" });
  }
});

// 3.4 Delete Order
export const deleteOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const order = await Order.findById(orderId);

  if (order) {
    await order.deleteOne();
    res.json({ message: "Order deleted successfully" });
  } else {
    res.status(404).json({ message: "Order not found" });
  }
});

export {
  registerAdmin,
  postProduct,
  updateProduct,
  deleteProduct,
  getAllProducts,
  getAdminProducts,
};

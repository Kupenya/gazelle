import mongoose from "mongoose";

// Define the order schema
const orderSchema = new mongoose.Schema({
  // userId for authenticated users, guestId for unauthenticated users (guests)
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false,
  },
  guestId: { type: String, required: false }, // Set guestId as String for guest users

  // Items in the order, each containing a reference to the product and its quantity
  items: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },
      quantity: {
        type: Number,
        required: true,
      },
      price: {
        type: Number,
        required: true,
      },
      size: {
        type: String,
      },
      color: {
        type: String,
      },
    },
  ],

  // Total amount for the order
  totalAmount: { type: Number, required: true },

  // Payment status with enum values
  paymentStatus: {
    type: String,
    enum: ["pending", "paid", "failed"],
    default: "pending",
  },

  // Order status with enum values
  orderStatus: {
    type: String,
    enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
    default: "pending",
  },
  shippingAddress: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, required: true },
  },

  // Timestamps for when the order is created
  createdAt: { type: Date, default: Date.now },
});

// Create the Order model based on the schema
const Order = mongoose.model("Order", orderSchema);

// Export the Order model
export default Order;

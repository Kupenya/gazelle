import mongoose from "mongoose";

const cartItemSchema = mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  quantity: {
    type: Number,
    default: 1,
    required: true,
  },
});

const cartSchema = mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  items: [cartItemSchema],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

cartSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

const Cart = mongoose.model("Cart", cartSchema);

export default Cart;

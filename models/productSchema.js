import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Admin",
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
  },
  availability: {
    type: String,
    enum: ["Available", "Unavailable"],
    default: "Available",
  },
  price: {
    type: Number,
    required: true,
  },
  sizes: [
    {
      type: String,
      required: true,
    },
  ],
  colors: [
    {
      type: String,
      required: false,
    },
  ],
  images: [
    {
      type: String,
      required: true,
    },
  ],
  description: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

productSchema.index({ admin: 1 });

const Product = mongoose.model("Product", productSchema);

export default Product;

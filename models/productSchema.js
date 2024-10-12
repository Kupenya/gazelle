import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Admin",
    required: true,
  },
  name: {
    type: String,
    required: [true, "Name is required"],
  },
  quantity: {
    type: Number,
    required: [true, "Quantity is required"],
  },
  availability: {
    type: String,
    enum: ["Available", "Unavailable"],
    default: "Available",
  },
  price: {
    type: Number,
    required: [true, "Price is required"],
  },
  sizes: [
    {
      type: String,
      required: [true, "sizes is required"],
    },
  ],
  colors: [
    {
      type: String,
      required: false,
    },
  ],
  images: {
    type: [
      {
        url: {
          type: String,
          required: true,
        },
        publicId: {
          type: String,
          required: true,
        },
      },
    ],
    validate: {
      validator: function (v) {
        return v.length >= 1 && v.length <= 3;
      },
      message: "Product must have between 1 and 3 images",
    },
    required: [true, "At least one image is required"],
  },

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

export const checkoutForAuthenticatedUser = async (req, res) => {
  try {
    const { shippingAddress } = req.body;

    // Fetch cart items from the database
    const cart = await Cart.findOne({ userId: req.user._id });
    if (!cart || !cart.items || cart.items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }
    const items = cart.items;
    const totalAmount = items.reduce(
      (total, item) => total + item.totalPrice,
      0
    );

    // Check product availability for each item in the cart
    for (let item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res
          .status(404)
          .json({ message: `Product ${item.name} not found` });
      }
      if (product.quantity < item.quantity) {
        return res.status(400).json({
          message: `Insufficient stock for ${item.name}. Available: ${product.quantity}`,
        });
      }
    }

    // Deduct quantity from the product table for each item
    for (let item of items) {
      const product = await Product.findById(item.productId);
      product.quantity -= item.quantity; // Deduct the quantity
      await product.save();
    }

    // Create the order
    const orderData = {
      items,
      totalAmount,
      shippingAddress,
      paymentMethod: "paystack",
      orderStatus: "pending",
      paymentStatus: "pending",
      userId: req.user._id,
    };

    const order = new Order(orderData);
    await order.save();

    // Clear the user's cart
    await Cart.findOneAndUpdate(
      { userId: req.user._id },
      { $set: { items: [] } }
    );

    const paymentResponse = await initializePayment(
      totalAmount,
      req.user.email,
      `http://localhost:5000/api/users/payment/callback/${order._id}`
    );

    return res.status(200).json({
      message: "Checkout successful. Please complete payment.",
      paymentUrl: paymentResponse.authorization_url,
      orderReference: paymentResponse.reference,
      orderId: order._id,
    });
  } catch (error) {
    console.error("Error during checkout:", error);
    return res.status(500).json({ message: "Server error during checkout" });
  }
};

// Checkout for Unauthenticated Users
export const checkoutForUnauthenticatedUser = async (req, res) => {
  try {
    const { shippingAddress } = req.body;
    const items = req.session.cart;
    if (!items || items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }
    const totalAmount = items.reduce(
      (total, item) => total + item.totalPrice,
      0
    );

    // Check product availability for each item in the cart
    for (let item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res
          .status(404)
          .json({ message: `Product ${item.name} not found` });
      }
      if (product.quantity < item.quantity) {
        return res.status(400).json({
          message: `Insufficient stock for ${item.name}. Available: ${product.quantity}`,
        });
      }
    }

    // Deduct quantity from the product table for each item
    for (let item of items) {
      const product = await Product.findById(item.productId);
      product.quantity -= item.quantity; // Deduct the quantity
      await product.save();
    }

    // Generate guest ID for unauthenticated users
    const guestId = req.session.guestId || generateGuestId();
    req.session.guestId = guestId;

    // Create the order
    const orderData = {
      items,
      totalAmount,
      shippingAddress,
      paymentMethod: "paystack",
      orderStatus: "pending",
      paymentStatus: "pending",
      guestId,
    };

    const order = new Order(orderData);
    await order.save();

    // Clear the session cart
    req.session.cart = [];

    const paymentResponse = await initializePayment(
      totalAmount,
      `${guestId}@guest.example.com`,
      `http://localhost:5000/api/users/payment/callback/${order._id}`
    );

    return res.status(200).json({
      message: "Checkout successful. Please complete payment.",
      paymentUrl: paymentResponse.authorization_url,
      orderReference: paymentResponse.reference,
      orderId: order._id,
    });
  } catch (error) {
    console.error("Error during checkout:", error);
    return res.status(500).json({ message: "Server error during checkout" });
  }
};

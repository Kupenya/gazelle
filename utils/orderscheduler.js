import cron from "node-cron";
import Order from "../models/order.js"; // Adjust path to your actual model

// Schedule the cron job to run once every day (or at the desired interval)
cron.schedule("0 0 * * *", async () => {
  // Runs every day at midnight
  try {
    const now = new Date();

    // Move from 'processing' to 'shipped' after 3 days if admin hasn't updated status
    const ordersToShip = await Order.find({
      orderStatus: "processing",
      paymentStatus: "paid",
      updatedAt: { $lte: new Date(now - 3 * 24 * 60 * 60 * 1000) }, // Orders not updated in the last 3 days
    });

    for (const order of ordersToShip) {
      // Assuming 'updatedAt' is the last time the order was modified
      order.orderStatus = "shipped";
      await order.save();
      console.log(`Order ${order._id} has been moved to 'shipped'.`);
    }

    // Move from 'shipped' to 'delivered' after 2 days
    const ordersToDeliver = await Order.find({
      orderStatus: "shipped",
      paymentStatus: "paid",
      updatedAt: { $lte: new Date(now - 2 * 24 * 60 * 60 * 1000) }, // Orders not updated in the last 2 days
    });

    for (const order of ordersToDeliver) {
      // Assuming 'updatedAt' is the last time the order was modified
      order.orderStatus = "delivered";
      await order.save();
      console.log(`Order ${order._id} has been moved to 'delivered'.`);
    }
  } catch (error) {
    console.error("Error during order status update:", error);
  }
});

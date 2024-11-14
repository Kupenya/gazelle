// utils/paymentProcessor.js
export const processPayment = (amount) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (Math.random() > 0.5) {
        resolve({ status: "success" });
      } else {
        resolve({ status: "failed" });
      }
    }, 1000);
  });
};

import express from "express";
import {
  authUserOrAdmin,
  registerUser,
  logoutUser,
  getUserProfile,
  updateUserProfile,
} from "../controllers/userController.js";

import { protect, userOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

// auth
router.post("/", registerUser);
router.post("/auth", authUserOrAdmin);
router.post("/logout", logoutUser);

export default router;

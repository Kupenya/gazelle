import asyncHandler from "express-async-handler";
import User from "../models/userModel.js";
import generateToken from "../utils/generateToken.js";
import Admin from "../models/adminModel.js";

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
  const { firstName, lastName, email, password, userState, isFarmer } =
    req.body;

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
        isFarmer,
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

//@desc    Get user profile
//route    GET /api/users/profile
//@access  Private
const getUserProfile = asyncHandler(async (req, res) => {
  if (!req.user) {
    return res.status(400).json({ message: "User not found" });
  }
  res.status(200).json({
    _id: req.user._id,
    firstName: req.user.firstName,
    lastName: req.user.lastName,
    email: req.user.email,
    userState: req.user.userState,
    isFarmer: req.user.isFarmer,
  });
});

//@desc    Update user profile
//route    PUT /api/users/profile
//@access  Private
const updateUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    user.firstName = req.body.firstName || user.firstName;
    user.lastName = req.body.lastName || user.lastName;
    user.userState = req.body.userState || user.userState;
    user.email = req.body.email || user.email;

    if (req.body.password) {
      user.password = req.body.password;
    }

    const updatedUser = await user.save();

    res.status(200).json({
      _id: updatedUser._id,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      userState: updatedUser.userState,
      email: updatedUser.email,
    });
  } else {
    res.status(404);
    throw new Error("User not found");
  }
});

export {
  authUserOrAdmin,
  registerUser,
  logoutUser,
  getUserProfile,
  updateUserProfile,
};

import jwt from "jsonwebtoken";
import User from "../models/userModel.js";
import Admin from "../models/adminModel.js";

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      let user;
      try {
        user = await User.findById(decoded.userId);
      } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Error finding user" });
      }

      if (!user) {
        try {
          user = await Admin.findById(decoded.userId);
        } catch (error) {
          console.error(error);
          return res.status(500).json({ message: "Error finding admin" });
        }

        if (!user) {
          return res.status(404).json({ message: "User or Admin not found" });
        }
      }

      req.user = user;
      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: "Not authorized, invalid token" });
    }
  } else {
    res.status(401).json({ message: "Not authorized, no token" });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user && req.user.isAdmin !== undefined && req.user.isAdmin) {
    next(); // Admin is authorized
  } else {
    res.status(403).json({ message: "Access denied: Admins only" });
  }
};

const userOnly = (req, res, next) => {
  if (req.user && req.user.isAdmin !== undefined && !req.user.isAdmin) {
    next(); // Regular user is authorized
  } else {
    res.status(403).json({ message: "Access denied: Users only" });
  }
};

export { protect, userOnly, adminOnly };

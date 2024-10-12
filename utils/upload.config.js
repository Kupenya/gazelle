import dotenv from "dotenv";
dotenv.config();
import { v2 as cloudinary } from "cloudinary";
import multer from "multer";

const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: { fileSize: 1024 * 1024 * 5 }, // 5MB file size limit
  fileFilter: function (req, file, cb) {
    if (!file.mimetype.match(/jpg|jpeg|png$/i)) {
      cb(new Error("Only images are allowed!"), false);
    } else {
      cb(null, true);
    }
  },
});

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadToCloudinary = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No files provided" });
    }
    // Validate number of images
    if (req.files.length < 1 || req.files.length > 3) {
      return res.status(400).json({ message: "Please upload 1-3 images" });
    }

    const promises = req.files.map((file) => {
      return new Promise((resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            { folder: "products", format: "jpg" },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          )
          .end(file.buffer);
      });
    });

    const results = await Promise.all(promises);

    req.body.images = results.map((result) => ({
      url: result.secure_url,
      publicId: result.public_id,
    }));
    next();
  } catch (err) {
    console.error("Cloudinary upload error:", err);
    res
      .status(500)
      .json({ message: "Cloudinary upload failed", error: err.message });
  }
};

export default { cloudinary, uploadToCloudinary, upload };

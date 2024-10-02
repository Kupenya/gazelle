import dotenv from "dotenv";
dotenv.config();
import { v2 as cloudinary } from "cloudinary";
import multer from "multer";

const upload = multer({
  dest: "./uploads/",
  limits: { fileSize: 1024 * 1024 * 5 }, // 5MB file size limit
  fileFilter(req, file, cb) {
    if (!file.mimetype.match(/jpg|jpeg|png$/i)) {
      cb(new Error("Only images are allowed!"));
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
    const promises = req.files.map((file) => {
      return cloudinary.uploader.upload(file.path, {
        public_id: file.originalname,
        folder: "products",
        format: "jpg",
      });
    });
    const results = await Promise.all(promises);
    req.files = results.map((result, index) => {
      return {
        ...req.files[index],
        cloudinaryUrl: result.secure_url,
        cloudinaryId: result.public_id,
      };
    });
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Cloudinary upload failed" });
  }
};

export default { cloudinary, uploadToCloudinary, upload };

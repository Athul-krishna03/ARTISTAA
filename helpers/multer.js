const multer = require("multer");
const path = require("path");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("./cloudinary");



const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: "product-images",
        allowed_formats: ["jpg", "png", "jpeg", "webp"],
        transformation: [{ width: 440, height: 440, crop: "limit" }],
    },
});

module.exports = storage;
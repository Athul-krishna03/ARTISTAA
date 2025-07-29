const multer = require("multer");
const path = require("path");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("./cloudinary");


// const storage = multer.diskStorage({
//     destination:(req,file,cb)=>{
//         cb(null,"public/uploads/re-image");
//     },
//     filename:(req,file,cb)=>{
//         cb(null,Date.now()+"-"+file.originalname);

//     }
// })


const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: "product-images",
        allowed_formats: ["jpg", "png", "jpeg", "webp"],
        transformation: [{ width: 440, height: 440, crop: "limit" }],
    },
});

module.exports = storage;
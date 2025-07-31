const express = require("express");
const router=express.Router();
const adminController=require("../controllers/admin/adminControllers");
const auth=require("../middlewares/auth");
const customerController=require("../controllers/admin/customerController");
const categoryController=require("../controllers/admin/categoryControllers");
const brandController = require("../controllers/admin/brandControllers");
const productController=require("../controllers/admin/productControllers");
const orderController=require("../controllers/admin/orderControllers");
const bannerController = require("../controllers/admin/bannerControllers");
const couponController = require("../controllers/admin/couponControllers")
const multer = require("multer");
const storage = require("../helpers/multer");
const uploads = multer({storage:storage});





router.get("/pageerror",adminController.pageerror)
router.get("/login",adminController.loadlogin);
router.post("/login",adminController.login);
router.get("/",auth.adminAuth,adminController.loadDashboard);
router.get("/logout",adminController.logout);

//customer routes
router.get("/users",auth.adminAuth,customerController.customerInfo);
router.patch("/blockCustomer",auth.adminAuth,customerController.customerBlocked);
router.patch("/unblockCustomer",auth.adminAuth,customerController.customerBlocked);
//category routes
router.get("/category",auth.adminAuth,categoryController.categoryInfo);
router.post("/addCategory",auth.adminAuth,categoryController.addCategory);
router.post("/addCategoryOffer",auth.adminAuth,categoryController.addCategoryOffer)
router.post("/removeCategoryOffer",auth.adminAuth,categoryController.removeCategoryOffer);
router.patch("/listCategory",auth.adminAuth,categoryController.getlistCategory);
router.patch("/unlistCategory",auth.adminAuth,categoryController.getlistCategory);
router.get("/editCategory",auth.adminAuth,categoryController.getEditCategory);
router.post("/editCategory",auth.adminAuth,categoryController.EditCategory)

//Brand routes
router.get("/brands",auth.adminAuth,brandController.getBrands);
router.post("/addBrand",auth.adminAuth,uploads.single("image"),brandController.addBrand);
router.patch("/blockBrand",auth.adminAuth,brandController.blockBrand);
router.get("/deleteBrand",auth.adminAuth,brandController.deleteBrand);

//banner

router.get("/banner",auth.adminAuth,bannerController.getBannerPage);
router.get("/addBanner",auth.adminAuth,bannerController.getAddBanner);
router.post("/addBanner",auth.adminAuth,uploads.single("images"),bannerController.addBanner);
router.get("/deleteBanner",auth.adminAuth,bannerController.deleteBanner);

//product routes
router.get("/addProducts",auth.adminAuth,productController.getProductAddPage);
router.post("/addProducts",auth.adminAuth,uploads.array("images",4),productController.addProducts);
router.get("/products",auth.adminAuth,productController.getAllProducts);
router.post("/addProductOffer",auth.adminAuth,productController.addProductOffer);
router.post("/removeProductOffer",auth.adminAuth,productController.removeProductOffer);
router.patch("/blockProduct",auth.adminAuth,productController.blockProduct);
router.get("/editProduct",auth.adminAuth,productController.getEditProduct)
router.post("/editProduct",auth.adminAuth,uploads.array("images",4),productController.editProduct);
router.post("/deleteImage",auth.adminAuth,productController.deleteSingleImage);


router.get("/orders",auth.adminAuth,orderController.getOrderDetails);
router.get("/order-details", auth.adminAuth, orderController.getOrderDetailsView);
router.get("/statusUpdate",auth.adminAuth,orderController.updateStatus);
router.get("/returnRequests",auth.adminAuth,orderController.getReturnRequest);
router.post("/update-return-status",auth.adminAuth,orderController.updateReturnRequest)

router.get("/stock",auth.adminAuth,productController.stockDetials);
router.post("/updateStock",auth.adminAuth,productController.updateStock);

router.get("/coupon",auth.adminAuth,couponController.getCouponPage);
router.post("/addCoupon",auth.adminAuth,couponController.addCoupon);
router.delete('/deleteCoupon',auth.adminAuth,couponController.deleteCoupon)


router.get("/salesReport",auth.adminAuth,orderController.getSalesReport)




module.exports=router;
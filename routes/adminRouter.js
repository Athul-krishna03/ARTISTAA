const express = require("express");
const router=express.Router();
const adminController=require("../controllers/admin/adminControllers");
const auth=require("../middlewares/auth");
const customerController=require("../controllers/admin/customerController");
const categoryController=require("../controllers/admin/categoryControllers");




router.get("/pageerror",adminController.pageerror)
router.get("/login",adminController.loadlogin);
router.post("/login",adminController.login);
router.get("/",adminController.loadDashboard);
router.get("/logout",adminController.logout);

//customers Management
router.get("/users",auth.adminAuth,customerController.customerInfo);
router.get("/blockCustomer",auth.adminAuth,customerController.customerBlocked);
router.get("/unblockCustomer",auth.adminAuth,customerController.customerBlocked);

router.get("/category",auth.adminAuth,categoryController.categoryInfo);
router.post("/addCategory",auth.adminAuth,categoryController.addCategory);




module.exports=router;
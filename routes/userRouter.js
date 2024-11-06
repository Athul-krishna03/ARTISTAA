const express=require("express");
const router=express.Router();
const userController=require("../controllers/user/userController");
const profileController=require("../controllers/user/profileControllers");
const cartController=require("../controllers/user/cartControllers");
const orderController= require("../controllers/user/orderController")
const passport = require("passport");
const auth=require("../middlewares/auth");


router.get("/pageNotFound",userController.pageNotFound)
router.get("/",userController.loadHomepage);
router.get("/getProducts",userController.getProducts)
router.get("/signup",userController.loadSignup);
router.post("/signup",userController.signup);
router.post("/verify-otp",userController.verifyOtp);
router.post("/resend-otp",userController.resendOtp);

//google auth routes

router.get("/auth/google",passport.authenticate("google",{scope:["profile","email"]}));
router.get("/auth/google/callback",passport.authenticate("google",{failureRedirect:"/signup"}),(req,res)=>{
    req.session.user = req.user._id
    res.redirect("/");
});

router.get("/login",userController.loadLogin);
router.post("/login",userController.login);
router.get("/logout",userController.logout);
router.get("/productDetails",userController.getProductView);


router.get("/forgot-password",profileController.getForgotPassPage);
router.post("/forgot-mail-vaild",profileController.forgotEmailValid);
router.post("/verify-passForgot-otp",profileController.verifyForgotPassOtp);
router.get("/reset-password",profileController.getResetPassPage);
router.post("/resend-forgot-otp",profileController.resendOtp);
router.post("/reset-password",profileController.postNewPassword);

router.get("/userProfile",auth.userAuth,profileController.getUserDashboard);
router.post("/userProfile",auth.userAuth,profileController.userAccDetialsUpdate)
router.get("/add-address",auth.userAuth,profileController.loadAddAddress)
router.post("/add-address",profileController.addEditAddress);
router.get("/delete-address",profileController.deleteAddress);
router.get("/edit-address",profileController.editAddress);
router.post("/edit-address",profileController.addEditAddress);
router.get("/cart",cartController.showCart);
router.get("/addCart",cartController.addToCart);
router.get("/removeCart",cartController.removeCart);
router.get("/checkout",cartController.getCheckOut);
router.get("/updateQuantity",cartController.updateQty)

router.post("/place-order",orderController.createOrder);
router.get("/order-details",orderController.getOrderDetails);
router.get("/order-cancel",orderController.cancelOrder);



module.exports=router;
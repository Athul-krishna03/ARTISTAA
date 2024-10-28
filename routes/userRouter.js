const express=require("express");
const router=express.Router();
const userController=require("../controllers/user/userController");
const passport = require("passport");
const auth=require("../middlewares/auth");


router.get("/pageNotFound",userController.pageNotFound)
router.get("/",userController.loadHomepage);
router.get("/signup",userController.loadSignup);
router.post("/signup",userController.signup);
router.post("/verify-otp",userController.verifyOtp);
router.post("/resend-otp",userController.resendOtp);

//google auth routes

router.get("/auth/google",passport.authenticate("google",{scope:["profile","email"]}));
router.get("/auth/google/callback",passport.authenticate("google",{failureRedirect:"/signup"}),(req,res)=>{
    res.redirect("/");
});

router.get("/login",auth.userAuth,userController.loadLogin);
router.post("/login",userController.login);
router.get("/logout",auth.userAuth,userController.logout)







module.exports=router;
const express = require("express");
const router = express.Router();
const Cart = require("../models/cartSchema");
const User = require("../models/userSchema");
const Wishlist = require("../models/wishlistSchema")
const userController = require("../controllers/user/userController");
const profileController = require("../controllers/user/profileControllers");
const cartController = require("../controllers/user/cartControllers");
const orderController = require("../controllers/user/orderController");
const paymentController = require("../controllers/user/paymentControllers");
const wishlistController= require("../controllers/user/wishlistControllers")


const passport = require("passport");
const auth = require("../middlewares/auth");

const mongoose = require("mongoose");

router.use(async (req, res, next) => {
  try {
    res.locals.user = null;
    res.locals.cartCount = 0;
    res.locals.wishlistCount = 0;

    if (req.session.user && mongoose.Types.ObjectId.isValid(req.session.user)) {
      const user = await User.findById(req.session.user) || null;
      res.locals.user = user;
      const cart = await Cart.findOne({ userId: req.session.user }).populate('items.productId');
      if (cart) {
        const activeCartItems = cart.items.filter(
          item => item.productId && !item.productId.isBlocked && item.productId.quantity >= item.quantity
        );
        res.locals.cartCount = activeCartItems.length;
      }
      const wishlist = await Wishlist.findOne({ userId: req.session.user }).populate('products.productId');
      if (wishlist) {
        const activeWishlistItems = wishlist.products.filter(
          item => item.productId && !item.productId.isBlocked && item.productId.quantity >= 1
        );
        res.locals.wishlistCount = activeWishlistItems.length;
      }
    }

    next();
  } catch (error) {
    console.error("Error in middleware:", error);
    next(error);
  }
});


router.get("/pageNotFound", userController.pageNotFound)
router.get("/",userController.loadHomepage);
router.get("/shop",userController.loadShopPage);
router.get("/getProducts", userController.getProducts);
router.get("/search",userController.searchResult)
router.get("/signup", userController.loadSignup);
router.post("/signup", userController.signup);
router.post("/verify-otp", userController.verifyOtp);
router.post("/resend-otp", userController.resendOtp);

//google auth routes

router.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));
router.get("/auth/google/callback", passport.authenticate("google", { failureRedirect: "/signup" }), (req, res) => {
  req.session.user = req.user._id
  res.redirect("/");
});

router.get("/login", userController.loadLogin);
router.post("/login", userController.login);
router.get("/logout", userController.logout);
router.get("/productDetails", userController.getProductView);
router.get('/about-us', (req, res) => {
  res.render('about');
});


router.get("/forgot-password", profileController.getForgotPassPage);
router.post("/forgot-mail-vaild", profileController.forgotEmailValid);
router.post("/verify-passForgot-otp", profileController.verifyForgotPassOtp);
router.get("/reset-password", profileController.getResetPassPage);
router.post("/resend-forgot-otp", profileController.resendOtp);
router.post("/reset-password", profileController.postNewPassword);

router.get("/userProfile", auth.userAuth, profileController.getUserDashboard);
router.post("/userProfile", auth.userAuth, profileController.userAccDetialsUpdate)
router.get("/add-address", auth.userAuth, profileController.loadAddAddress)
router.post("/add-address",auth.userAuth, profileController.addEditAddress);
router.get("/delete-address", auth.userAuth,profileController.deleteAddress);
router.get("/edit-address",auth.userAuth,profileController.editAddress);
router.post("/edit-address",auth.userAuth, profileController.addEditAddress);
router.get("/cart",auth.userAuth,cartController.showCart);
router.get("/addCart",auth.userAuth ,cartController.addToCart);
router.get("/removeCart",auth.userAuth, cartController.removeCart);
router.get("/checkout", auth.userAuth,cartController.getCheckOut);
router.post("/updateQuantity", auth.userAuth,cartController.updateQty)

router.post("/place-order",  auth.userAuth,orderController.createOrder);
router.get('/order-success', auth.userAuth,orderController.orderSuccess);
router.get('/download-invoice',auth.userAuth,orderController.getInvoice);

router.get("/order-details", auth.userAuth, orderController.getOrderDetails);
router.get("/order-cancel", auth.userAuth, orderController.cancelOrder);
router.post("/submit-return",auth.userAuth,orderController.returnSubmit)

router.post("/apply-coupon",auth.userAuth,orderController.applyCoupon);
router.post("/createPayment",auth.userAuth,paymentController.createPayment);
router.post("/updatePayment",auth.userAuth,paymentController.updatePaymentStatus);
router.post("/retry-payment",auth.userAuth,paymentController.retryPayment)

router.get("/wishlist",auth.userAuth,wishlistController.getWishlist);
router.get("/addWishlist",auth.userAuth,wishlistController.addWishlist);
router.post("/removeWishlist",auth.userAuth,wishlistController.removeFromWishlist);
router.get("/checkWishlist",auth.userAuth,wishlistController.checkWishlist);

router.get("/coupons",auth.userAuth,wishlistController.getcouponList)


module.exports = router;
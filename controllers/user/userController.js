const { assign } = require("nodemailer/lib/shared");
const User = require("../../models/userSchema");
const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");
const nodemailer = require("nodemailer");
const Cart = require("../../models/cartSchema");
const Wallet = require("../../models/walletSchema")
const Banner = require("../../models/Banner");
const env = require("dotenv").config();
const axios=require('axios')
const bcrypt = require("bcrypt");
const { session } = require("passport");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const getProducts = async (req, res) => {
  const { sort, category } = req.query;
  let sortOption = {};
  let filterOption = {};

  switch (sort) {
    case "az":
      sortOption = { productName: 1 };
      break;
    case "za":
      sortOption = { productName: -1 };
      break;
    case "priceLow":
      sortOption = { salePrice: 1 };
      break;
    case "priceHigh":
      sortOption = { salePrice: -1 };
      break;
    case "popularity":
      sortOption = { rating: -1 };
      break;
    default:
      sortOption = {};
  }

  if (category) {
    filterOption.category = category;
  }

  try {
    const products = await Product.find(filterOption).sort(sortOption);

    if (req.headers.accept && req.headers.accept.includes("application/json")) {
      return res.json({ products });
    }
    res.render("home", { products });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const loadHomepage = async (req, res) => {
  try {
    const userId = req.session.user;
    const categories = await Category.find({ isListed: true });
    const banners = await Banner.find();
    let productData = await Product.find({
      isBlocked: false,
      category: { $in: categories.map((category) => category._id) },
      quantity: { $gt: 0 },
    }).populate('category');

    productData.sort((a, b) => new Date(b.createdOn) - new Date(a.createdOn));
    if (userId) {
      const userData = await User.findById(userId);
      if (!userData.isAdmin) {
        return res.render("home", {
          products: productData,
          banners: banners,
          categories: categories,
        });
      } else {
        return res.render("home", {
          products: productData,
          banners: banners,
          categories: categories,
        });
      }
    } else {
      return res.render("home", {
        products: productData,
        banners: banners,
        categories: categories,
      });
    }
  } catch (error) {
    console.log(error, "Home not found");
    res.status(500).send("Server error");
  }
};
const loadShopPage = async (req, res) => {
  try {
    const userId = req.session.user;
    const categories = await Category.find({ isListed: true });
    let productData = await Product.find({
      isBlocked: false,
      category: { $in: categories.map((category) => category._id) },
      quantity: { $gt: 0 },
    });

    productData.sort((a, b) => new Date(b.createdOn) - new Date(a.createdOn));
    // productData = productData.slice(0);
    if (userId) {
      const userData = await User.findById(userId);
      if (!userData.isAdmin) {
        return res.render("shop", {
          products: productData,
          categories: categories,
        });
      } else {
        return res.render("shop", {
          products: productData,
          categories: categories,
        });
      }
    } else {
      return res.render("shop", {
        products: productData,
        categories: categories,
      });
    }
  } catch (error) {
    console.log(error, "Home not found");
    res.status(500).send("Server error");
  }
};
const loadSignup = async (req, res) => {
  try {
    return res.render("signup");
  } catch (error) {
    console.log(error, "Signup not found");
    res.status(500).send("Server error");
  }
};

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateReferralCode() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let referralCode = '';
    for (let i = 0; i < 6; i++) {
        referralCode += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return referralCode;
}

async function sendVerificationEmail(email, otp) {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASSWORD,
      },
    });

    const info = await transporter.sendMail({
      from: process.env.NODEMAILER_EMAIL,
      to: email,
      subject: "verify your account ",
      text: `your OTP is ${otp}`,
      html: `<b>your OTP:${otp}</b>`,
    });

    return info.accepted.length > 0;
  } catch (error) {
    console.error("Error sending email", error);
    return false;
  }
}

const signup = async (req, res) => {
  try {
    const { username, email, phone, password, cpassword ,referalCode} = req.body;
    console.log(password, cpassword);
    if (password != cpassword) {
      return res.render("signup", { message: "pass not match" });
    }

    const findUser = await User.findOne({ email: email });
    console.log(findUser);
    if (findUser) {
      return res.render("signup", {
        message: "User with this email already exist",
      });
    }
    const otp = generateOtp();
    const Code=generateReferralCode();

    const emailSent = await sendVerificationEmail(email, otp);
    if (!emailSent) {
      return res.json("email error");
    }

    req.session.userOtp = otp;
    req.session.user = { username, email, phone, password,Code,referalCode};
    console.log(req.session.user);

    res.render("verify-otp");
    console.log("OTP sent", otp);
  } catch (error) {
    console.error("signup error", error);
    res.redirect("/pageNotFound");
  }
};

const loadShopping = async (req, res) => {
  try {
    return res.render("shop");
  } catch (error) {
    console.log(error, "shop not found");
    res.status(500).send("Server error");
  }
};

const pageNotFound = async (req, res) => {
  try {
    res.render("page-404");
  } catch (error) {
    res.redirect("/pageNotFound");
  }
};

const securePassword = async (password) => {
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    return passwordHash;
  } catch (error) {}
};

const verifyOtp = async (req, res) => {
  try {
    const { otp } = req.body;
    console.log(otp);
    if (otp == req.session.userOtp) {
      const user = req.session.user;
      const passwordHash = await securePassword(user.password);
      const saveUserData = new User({
        username: user.username,
        email: user.email,
        phone: user.phone,
        password: passwordHash,
        referalCode:user.Code
      });
      await saveUserData.save();
      req.session.user = saveUserData._id;
      if(user.referalCode){
        const referedUser=await User.findOne({referalCode:user.referalCode});
        console.log("referedCode",referedUser);
        const walletUpdate = await Wallet.findOneAndUpdate(
          { userId: referedUser._id },
          {
            $inc: { balance:120},
            $push: {
              transactions: {
                type: "Referal",
                amount: 120,
              },
            },
          },
          { upsert: true, new: true }
        );
        const walletUpdateNewUser = await Wallet.findOneAndUpdate(
          { userId: saveUserData._id },
          {
            $inc: { balance:100},
            $push: {
              transactions: {
                type: "Referal",
                amount: 100,
              },
            },
          },
          { upsert: true, new: true }
        );
        if(!walletUpdate && !walletUpdateNewUser){
          return  res.json({success:false,message:"error in wallet Update"})
        }
      }
      console.log(saveUserData);
      return res.json({ success: true, redirectUrl: "/" });
    } else {
     return  res.status(400).json({ success: false, message: "Invalid OTP,Please try again" });
    }
  } catch (error) {
    console.error("Error verifying OTP", error);
    return res.status(500).json({ success: false, message: "An error occured" });
  }
};

const resendOtp = async (req, res) => {
  try {
    const { email } = req.session.user;
    if (!email) {
      res
        .status(400)
        .json({ succes: false, message: "email not found in the sesion" });
    }
    const otp = generateOtp();
    req.session.userOtp = otp;

    const emailSent = await sendVerificationEmail(email, otp);
    if (emailSent) {
      console.log("ResendOtp", otp);
      res
        .status(200)
        .json({ success: true, message: "OTP resend Successfully" });
    } else {
      res
        .status(500)
        .json({ success: false, message: "Failed to resendOtp,try again" });
    }
  } catch (error) {
    console.error("Error resending OTP", error);
    res.status(500).json({ success: false, message: "Internal server erorr" });
  }
};

const loadLogin = async (req, res) => {
  try {
    if (req.session.user) {
      const user = await User.findById(req.session.user);
      if (user && user.isBlocked) {
        req.session.user = null;
        return res.render("login", { message: "User is blocked" });
      }
      return res.redirect("/");
    } else {
      return res.render("login");
    }
  } catch (error) {
    console.log(error);
    return res.redirect("/pageNotFound");
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const findUser = await User.findOne({ isAdmin: 0, email: email });

    if (!findUser) {
      return res.render("login", { message: "user not foud" });
    }
    if (findUser.isBlocked) {
      return res.render("login", { message: "user is blocked" });
    }
    const passwordMatch = await bcrypt.compare(password, findUser.password);
    if (!passwordMatch) {
      return res.render("login", { message: "Incorrect password" });
    }

    req.session.user = findUser._id;

    res.redirect("/");
  } catch (error) {
    console.error("loginError", error);
    res.render("login", { message: "login failed. please try again later" });
  }
};
const logout = async (req, res) => {
  try {
    req.session.user = null;
    return res.redirect("/");
  } catch (error) {
    console.log(error);
  }
};

const getProductView = async (req, res) => {
  try {
    const id = req.query.id;
    const productData = await Product.findById(id);
    return res.render("productDetials", { data: productData });
  } catch (error) {
    console.log("productView Error", error);
  }
};

const searchResult = async (req, res) => {
  try {
    const { query } = req.query;
    const products = await Product.find({
      $or: [
        { productName: { $regex: query, $options: "i" } },
      ],
    });
  
    return res.json({ products });
  } catch (error) {
    console.log("error in searching", error);
  }
};
const API_KEY ="AIzaSyAmMONpQKoZvAcE111_eHFClW7w-7x1c2o";
const chatBotEndPoint  =async (req,res) => {
  const { message } = req.body;

  const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const prompt = message;
console.log(req.body)
const result = await model.generateContent(prompt);
return res.json(result.response.text());
  
//   try {
//     const response = await axios.post('https://aistudio.googleapis.com/v1beta3/models/gemini-chat:predict', {
//         prompt: userMessage,
//     }, {
//         headers: {
//             'Authorization': `Bearer ${API_KEY}`,
//             'Content-Type': 'application/json'
//         }
//     });
    
//     console.log(response.data); // Log response data to verify
// } catch (error) {
//     console.error('Error with API request:', error); // More specific error log
// }

}
module.exports = {
  loadHomepage,
  chatBotEndPoint,
  loadShopPage,
  loadSignup,
  loadShopping,
  pageNotFound,
  signup,
  verifyOtp,
  resendOtp,
  loadLogin,
  login,
  logout,
  getProducts,
  getProductView,
  searchResult
};

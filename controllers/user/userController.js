
const { assign } = require("nodemailer/lib/shared");
const User=require("../../models/userSchema");
const nodemailer=require("nodemailer");
const env=require("dotenv").config();
const bcrypt=require("bcrypt");
const { session } = require("passport");
const loadHomepage=async (req,res) => {
    try {
        const user=req.session.user;
        console.log(user)
        if(user){
            const userData= await User.findOne({username:user.username});
            // console.log(user);
            return res.render("home",{user:userData});
        }else{
            return res.render("home");
        }
       
    } catch (error) {
        console.log(error,"Home not found");
        res.status(500).send("Server error")
        
    }
}
const loadSignup=async (req,res) => {
    try {
     return res.render("signup");
    } catch (error) {
        console.log(error,"Signup not found");
        res.status(500).send("Server error")
        
    }
}

function generateOtp(){
    return Math.floor(100000+Math.random()*900000).toString();
}

async function sendVerificationEmail(email,otp) {
    try {
     const transporter=nodemailer.createTransport({
        service:"gmail",
        port:587,
        secure:false,
        requireTLS:true,
        auth:{
            user:process.env.NODEMAILER_EMAIL,
            pass:process.env.NODEMAILER_PASSWORD
        }
     })

     const info = await transporter.sendMail({
        from:process.env.NODEMAILER_EMAIL,
        to:email,
        subject:"verify your account ",
        text:`your OTP is ${otp}`,
        html:`<b>your OTP:${otp}</b>`,

     });

     return info.accepted.length>0

        
    } catch (error) {
        console.error("Error sending email",error);
        return false;
    }
    
}

const signup=async (req,res) => {
    
    
    try {
      
        const {username,email,phone,password,cPassword}=req.body;
       
       
        if(password != cPassword){
            return res.render("signup",{message:"pass not match"})
        }
       
       
        const findUser= await User.findOne({email});
        console.log(findUser)
        if(findUser){
            return res.render("signup",{message:"User with this email already exist"});

        }
        const otp =generateOtp();

        const emailSent= await sendVerificationEmail(email,otp);
        if(!emailSent){
            return res.json("email error")
        }

        req.session.userOtp=otp;
        req.session.user={username,email,phone,password};

        res.render("verify-otp");
        console.log("OTP sent",otp);
      
    } catch (error) {
        console.error("signup error",error);
        res.redirect("/pageNotFound")
    }
}

const loadShopping=async (req,res) => {
    try {
     return res.render("shop");
    } catch (error) {
        console.log(error,"shop not found");
        res.status(500).send("Server error")
        
    }
}

const pageNotFound=async (req,res) => {
    try {
        res.render("page-404")
    } catch (error) {
        res.redirect("/pageNotFound")
    }

}

const securePassword=async (password) => {
    try {
        
    const passwordHash=await bcrypt.hash(password,10);
    return passwordHash;

    } catch (error) {
        
    }
}

const verifyOtp=async (req,res) => {
    try {
        const {otp}=req.body;
        console.log(otp);
        if(otp==req.session.userOtp){
            const user=req.session.user;
            const passwordHash=await securePassword(user.password);
            const saveUserData= new User({
                username:user.username,
                email:user.email,
                phone:user.phone,
                password:passwordHash
            })

            await saveUserData.save();
            req.session.user=saveUserData;
            console.log(saveUserData)
            res.json({success:true,redirectUrl:"/"})
        }else{
            res.status(400).json({success:false,message:"Invalid OTP,Please try again"})
        }
    } catch (error) {
        console.error("Error verifying OTP",error);
        res.status(500).json({success:false,message:"An error occured"})
    }
}

const resendOtp=async (req,res) => {
    try {
        const {email}=req.session.user;
        if(!email){
    res.status(400).json({succes:false,message:"email not found in the sesion"})
    }
    const otp=generateOtp();
    req.session.userOtp=otp;
    
    const emailSent= await sendVerificationEmail(email,otp);
    if(emailSent){
        console.log("ResendOtp",otp);
        res.status(200).json({success:true,message:"OTP resend Successfully"})
        
    }else{
        res.status(500).json({success:false,message:"Failed to resendOtp,try again"})
    }
    } catch (error) {
        console.error("Error resending OTP",error);
        res.status(500).json({success:false,message:"Internal server erorr"})
        
        
    }
}

const loadLogin=async (req,res) => {
    try {
        if(!req.session.user){
           return res.render("login");

        }else{
            return res.redirect("/")
        }
       
    } catch (error) {
        console.log(error)
       return res.redirect("/pageNotFound");
    }
}
const login=async (req,res) => {
    try {
        const {email,password}=req.body;
        const findUser=await User.findOne({isAdmin:0,email:email});
        
        if(!findUser){
            return res.render("login",{message:"user not foud"});
        }
        if(findUser.isBlocked){
            return res.render("login",{message:"user is blocked"})
        }
        const passwordMatch=await bcrypt.compare(password,findUser.password);
        if(!passwordMatch){
            return res.render("login",{message:"Incorrect password"});
        }

        req.session.user=findUser;
        
        
        res.redirect("/");
        
    } catch (error) {
        console.error("loginError",error);
        res.render("login",{message:"login failed. please try again later"});
    }
}
const logout=async (req,res) => {
    try {
        
         req.session.destroy((err)=>{
            if(err){
                console.log(err);
                return res.redirect("/pageNotFound")
                    
            }
        });
        return res.redirect("/");
       
    } catch (error) {
        console.log(error);
        
    }
}

module.exports={
    loadHomepage,
    loadSignup,
    loadShopping,
    pageNotFound,
    signup,
    verifyOtp,
    resendOtp,
    loadLogin,
    login,
    logout
}
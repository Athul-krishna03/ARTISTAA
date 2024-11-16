const User = require("../../models/userSchema");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const env = require("dotenv").config();
const session = require("express-session");
const { get } = require("mongoose");
const Address = require("../../models/addressSchema");
const Order = require("../../models/orderSchema");
const Wallet = require("../../models/walletSchema");




function generateOtp(){
    return Math.floor(100000+Math.random()*900000).toString();
}

const sendVerificationEmail = async(email,otp) => {
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

     const mailOptions = {
        from:process.env.NODEMAILER_EMAIL,
        to:email,
        subject:"Your OTP for password reset ",
        text:`your OTP is ${otp}`,
        html:`<b>your OTP:${otp}</b>`,

     }

     const info = await transporter.sendMail(mailOptions);
     console.log("email Sent:" , info.messageId);
     return true;
    } catch (error) {
        console.error("Error sending email",error);
        return false;
    }
    
}

const securePassword = async (password) => {
    const passwordHash = await bcrypt.hash(password,10);
    return passwordHash;
}


const getForgotPassPage = async (req,res) => {
    try {
        res.render("forgot-password");
    } catch (error) {
        console.log("getpage error",error);
        return res.redirect("/pageNotFound");
    }
}

const forgotEmailValid = async (req,res) => {
    try {
        const {email} = req.body;
        const findUser = await User.findOne({email:email});
        if(findUser){
            const otp = generateOtp();
            const emailSent = await sendVerificationEmail(email,otp);
            if(emailSent){
                req.session.userOtp = otp;
                req.session.email=email;
                res.render("forgotPass-otp");
                console.log("otp:",otp);
            }else{
                res.json({success:false,message:"Failed to sent OTP,Please try again"});

            }
        }else{
            res.render("forgot-password",{message:"User with this email not exist"});

        }
        
    } catch (error) {
        console.log(error)
        res.redirect("/pageNotFound")
    }
}

const verifyForgotPassOtp =async (req,res) => {
    try {
        const enteredOtp = req.body.otp;
        if(enteredOtp == req.session.userOtp){
            res.json({success:true,redirectUrl:"/reset-password"});
        }else{
            res.json({success:false,message:"OTP not matching"});
        }
    } catch (error) {
        res.status(500).json({success:false,message:"An error occured please try again"})
    }
}

const getResetPassPage = async (req,res) => {
    try {
        res.render('reset-password');
    } catch (error) {
        console.log(error);
        res.redirect('/pageNotFound')
    }
}

const resendOtp = async (req,res) => {
    try {
        const otp = generateOtp();
        req.session.userOtp = otp;
        const email = req.session.email;
        console.log("resending to",email);
        const emailSent = await sendVerificationEmail(email,otp);
        if(emailSent){
            console.log("Resend OTP:",otp);
            res.status(200).json({success:true,message:"Resend OTP Successfully"})
            
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({success:false,message:"Internal server error"})
        
    }
}

const postNewPassword = async (req,res) => {
    console.log( req.body)
    try {
        const {newPass1,newPass2} = req.body;
        
        const email = req.session.email;
        if(newPass1 === newPass2){
            const passwordHash = await securePassword(newPass1);
            await User.updateOne(
                {email:email},
                {$set:{password:passwordHash}}
            )
            res.redirect("/login");
        }else{
            res.render("reset-password",{message:"passwords do not match"})
        }
        


    } catch (error) {
        console.log(error);
        res.redirect("/pageNotFound")
    }
}

const getUserDashboard = async (req,res) => {
    try {
        const order = await Order.find({userId:req.session.user}) || [];
        console.log(order)
        const user = await User.findById({_id:req.session.user})
        const addresses = await Address.findOne({ userId: req.session.user }) || [];
        const wallet = await Wallet.findOne({ userId: req.session.user }).populate("transactions.orderId");
        res.render("userDashboard",{addresses:addresses.address,user:user,orders:order,wallet:wallet})
    } catch (error) {
        console.log(error)
    }
}


const loadAddAddress = async (req,res) => {
    try {
        const user = req.session.user;
        
        res.render("addressAdd",{user:user})
    } catch (error) {
        console.log(error,"getAddAddresspage");
        
    }
}
const addEditAddress = async (req, res) => {
    try {
        const user = req.session.user;
        
        if (!user) {
            return res.status(401).json({ message: 'Unauthorized access.' });
        }

        const { addressId, addressType, name, city, landMark, state, pincode, phone, altPhone } = req.body;
        const addressData = {
            addressType,
            name,
            city,
            landMark,
            state,
            pincode,
            phone,
            altPhone
        };

        let addressDocument = await Address.findOne({ userId: user });
        if (!addressDocument) {
            addressDocument = new Address({ userId: user, address: [] });
        }

        if (addressId) {
            const addressIndex = addressDocument.address.findIndex(address => address._id.toString() === addressId);
            
            if (addressIndex !== -1) {
                addressDocument.address[addressIndex] = { ...addressDocument.address[addressIndex].toObject(), ...addressData };
            } else {
                return res.status(404).json({ message: 'Address not found.' });
            }
        } else {
            addressDocument.address.push(addressData);
        }
        await addressDocument.save();

        res.redirect("/userProfile");
    } catch (error) {
        console.error('Error adding or editing address:', error);
        res.status(500).json({ message: 'Failed to add or edit address.' });
    }
};


const deleteAddress = async (req, res) => {
    try {
        const userId = req.session.user;
        const addressId = req.query.id;

        const addresses = await Address.findOne({ userId: userId });
        if (!addresses) {
            return res.redirect("/userProfile"); 
        }

        addresses.address = addresses.address.filter((address) => address._id.toString() !== addressId);

        await addresses.save();

        res.redirect("/userProfile");
    } catch (error) {
        console.log("Error in deleting address:", error);
        res.status(500).send("Failed to delete address.");
    }
};

const editAddress = async (req, res) => {
    const userId = req.session.user;
    const addressId = req.query.id;

    try {
        if (!userId) {
            return res.redirect('/login');
        }

        const addressDoc = await Address.findOne({ userId: userId });

        if (addressDoc) {
            const address = addressDoc.address.find(addr => addr._id.toString() === addressId);
            if (address) {
                res.render('edit-address', { address , userId});
            } else {
                res.status(404).send('Address not found');
            }
        } else {
            res.status(404).send('Address document not found');
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
};

const userAccDetialsUpdate = async (req,res) => {
    try {
        const userId = req.query.id;
        const {name,email,phone} = req.body;
        const updateProfile = await User.findOneAndUpdate({_id:userId},{$set:{username:name,email:email,phone:phone}});
        if(updateProfile){
            res.redirect("/userProfile");
        }
    } catch (error) {
        res.status(500).send("account acc error");
    }
} 



module.exports={
    getForgotPassPage,
    forgotEmailValid,
    verifyForgotPassOtp,
    getResetPassPage,
    resendOtp,
    postNewPassword,
    getUserDashboard,
    userAccDetialsUpdate,
    addEditAddress,
    loadAddAddress,
    deleteAddress,
    editAddress
   
}
const User = require("../../models/userSchema");
const mongoose= require("mongoose");
const bcrypt=require("bcrypt");

const pageerror=async(req,res)=>{
    res.render("admin-error")
}

const loadlogin=async (req,res) => {
    try {
        if(req.session.admin){
            return res.redirect("/admin")
        }
        // console.log("hi")
        res.render("admin-login");
    } catch (error) {
        console.error("adminLogin error",error.message);
        
    }
}
const login =async (req,res) => {
    try {
        const {email,password}=req.body;
        const admin = await User.findOne({email,isAdmin:true})
        req.session.user=admin
        if(admin){
            const passMatch=await bcrypt.compare(password,admin.password);
            
            if(passMatch){
                req.session.admin=true;
                return res.redirect("/admin");

            }else{
                return res.redirect("/admin/login")
            }
        }else{
            return res.redirect("/admin/login")
        }
    } catch (error) {
        console.error("login error",error.message)
    }
}
const loadDashboard=async (req,res) => {
    try {
        if(req.session.admin){
            res.render("dashboard")
        }else{
            res.redirect("/admin/login")
        }
    } catch (error) {
        console.error("dashBoard render error",error.message)
    }
}


const logout=async (req,res) => {
    try {
        req.session.admin=null;
        return res.redirect("/admin/login")
        
        
    } catch (error) {
        console.error("logout error",error.message)
    }
}




module.exports={
    loadlogin,
    login,
    loadDashboard,
    logout,
    pageerror
}
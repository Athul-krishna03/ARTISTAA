const Banner = require("../../models/Banner");
const path = require("path");
const fs = require("fs");

const getBannerPage = async (req,res) => {
    try {
        const findBanner = await Banner.find();
        res.render("banner",{data:findBanner,activePage:"banner"});
    } catch (error) {
        res.redirect("/pageNotFound")
        console.log("banner Page getting error",error);
        
    }
}

const getAddBanner = async (req,res) => {
    try {
        if(req.session.admin){
           return res.render("addBanner",{activePage:"banner"})
        }else{
            return res.redirect("/admin/login")
        }
        
        
    } catch (error) {
        console.log("addBanner error",error);
        return res.status(404).redirect("/pageNotFound")
    }
}

const addBanner = async (req,res) => {
    try {
        const data = req.body;
        const image =req.file;
        console.log("data",data,"image",image);
        const newBanner = new Banner({
            image:image.filename,
            title:data.title,
            description:data.description,
            startDate:new Date(data.startDate + "T00:00:00"),
            endDate : new Date(data.endDate + "T00:00:00"),
            link:data.link
        });
        console.log(newBanner)
        await newBanner.save();
        console.log("save banner");
        return res.redirect("/admin/banner");

    } catch (error) {
        console.log(error)
        res.redirect("/pageNotFound")
    }
}
const deleteBanner = async (req,res) => {
    try {
        const bannerId = req.query.id;
        const deleteBanner = await Banner.findByIdAndDelete(bannerId);
        if(deleteBanner){
            return res.status(200).json({status:true,message:"Banner has been deleted successfully"})
        }
    } catch (error) {
        console.log(error);
        return res.redirect("/pageNotFound")
    }
}
module.exports={
    getBannerPage,
    getAddBanner,
    addBanner,
    deleteBanner
}
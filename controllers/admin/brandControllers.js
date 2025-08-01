const Brand = require("../../models/brand");
const Product = require("../../models/productSchema");


const getBrands = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 4;
        const skip = (page - 1) * limit;
        const search = req.query.search || "";
        const regex = new RegExp(search, "i");

        const filter = {
            brandName: { $regex: regex }
        };

        const brandData = await Brand.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const totalBrands = await Brand.countDocuments(filter);
        const totalPages = Math.ceil(totalBrands / limit);

        if (req.xhr || req.headers.accept.includes("application/json")) {
            return res.json({
                success: true,
                data: brandData,
                totalBrands,
                totalPages,
                currentPage: page,
            });
        } else {
            res.render("brands", {
                data: brandData.reverse(),
                totalBrands,
                totalPages,
                currentPage: page,
                activePage: "brands",
            });
        }
    } catch (error) {
        console.error("Error fetching brands:", error);
        if (req.xhr || req.headers.accept.includes("application/json")) {
            return res.status(500).json({ success: false, message: "Failed to fetch brands" });
        } else {
            res.render("brands", {
                data: [],
                totalBrands: 0,
                totalPages: 0,
                currentPage: 1,
                activePage: "brands",
            });
        }
    }
};

const addBrand = async (req,res) => {
    try {
        const brand = req.body.name;
        const findBrand = await Brand.findOne({brandName:{ $regex: `^${brand}$`, $options: "i" }});
        if(!findBrand){
            const image =  req.file.path;
            const newBrand = new Brand({
                brandName:brand,
                brandImage:image
            });
            await newBrand.save();
            res.redirect("/admin/brands");
        }

    } catch (error) {
        console.log(error);
        
    }
}
const blockBrand=async(req,res)=>{
    try {
        let {id} = req.body;
        const data=await Brand.findById({_id:id});
        if(data.isBlocked == true){
            await Brand.updateOne({_id:id},{$set:{isBlocked:false}})
            res.json({success:true,message:"brand unBlock"})
        }else{
            await Brand.updateOne({_id:id},{$set:{isBlocked:true}});
            res.json({success:true,message:"brand Block"})
        }
    } catch (error) {
        console.log(error)
        
    }
}
const deleteBrand =async(req,res)=>{
    try {
        let {id} = req.body;
        console.log("req",req.body);
        
        await Brand.findByIdAndDelete({_id:id});
        res.json({success:true})
    } catch (error) {
        console.log(error);
        
    }
}
module.exports={
    getBrands,
    addBrand,
    blockBrand,
    deleteBrand
}
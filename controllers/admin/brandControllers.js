const Brand = require("../../models/brand");
const Product = require("../../models/productSchema");


const getBrands = async (req,res) => {
    try{
        const page = parseInt(req.query.page) || 1;
        const limit = 4;
        const skip =(page-1)*limit;
        const brandData = await Brand.find({})
        .sort({createdAt:-1})
        .skip(skip)
        .limit(limit);
        const totalBrands = await Brand.countDocuments();
        const totalPages = Math.ceil(totalBrands/limit);
        const reverseBrand = brandData.reverse()
        res.render("brands",{
            data:reverseBrand,
            totalBrands:totalBrands,
            totalPages:totalPages,
            currentPage:page,
            activePage: 'brands'
        })

    }catch(error){
      console.log(error)
    }
}

const addBrand = async (req,res) => {
    try {
        const brand = req.body.name;
        const findBrand = await Brand.findOne({brand});
        if(!findBrand){
            const image = req.file.filename;
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
        let id = req.query.id;
        const data=await Brand.findById({_id:id});
        if(data.isBlocked == true){
            await Brand.updateOne({_id:id},{$set:{isBlocked:false}})
            res.redirect("/admin/brands");
        }else{
            await Brand.updateOne({_id:id},{$set:{isBlocked:true}});
            res.redirect("/admin/brands");
        }
    } catch (error) {
        console.log(error)
        
    }
}
const deleteBrand =async(req,res)=>{
    try {
        let id = req.query.id;
        await Brand.findByIdAndDelete({_id:id});
        res.redirect("/admin/brands")
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
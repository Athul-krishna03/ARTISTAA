const Brand = require("../../models/brand");
const Product = require("../../models/productSchema");


const getBrands = async (req,res) => {
    try{
        const page = parseInt(req.query.page) || 1;
        const limit =4;
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
            currentPage:page
        })

    }catch(error){
      console.log(error)
    }
}

module.exports={
    getBrands
}
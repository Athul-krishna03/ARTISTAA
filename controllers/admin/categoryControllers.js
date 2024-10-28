const Category = require("../../models/categorySchema");


const categoryInfo = async (req,res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit =4;
        const skip =(page-1)*limit;

        const categoryData = await Category.find({})
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

        const totalCategories = await Category.countDocuments();
        const totalPages = Math.ceil(totalCategories/limit);
        res.render("category",{
            cat:categoryData,
            totalCategories:totalCategories,
            totalPages:totalPages,
            currentPage:page
        })
        
    } catch (error) {
        console.log(error.message)
    }
}

const addCategory= async(req,res)=>{
    const {name,description}=req.body;
    try {
        const exist =await Category.findOne({name:name});
        console.log(exist)
        if(exist){
            return res.status(400).json({error:"Category already exists"})
        }
        const newCategory = new Category({
            name,description
        })
        await newCategory.save();
        return res.json({message:"Category added"})
    } catch (error) {
        console.log(error.message);
        return res.status(500).json({error:"Internal Server"})
        
    }
}

module.exports={
    categoryInfo,
    addCategory
}
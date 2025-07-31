const Category = require("../../models/categorySchema");
const  Product= require("../../models/productSchema");


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
            currentPage:page,
            activePage: 'category'
        })
        
    } catch (error) {
        console.log(error.message)
    }
}

const addCategory= async(req,res)=>{
    const {name,description}=req.body;
    try {
        const exist = await Category.findOne({ name: { $regex: `^${name}$`, $options: "i" } });
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
};

const addCategoryOffer = async (req, res) => {
    try {
        const percentage = parseInt(req.body.percentage);
        const categoryId = req.body.categoryId;
        
       
        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(404).json({ status: false, message: "Category not found" });
        }
        
        console.log("catid:",category._id)
        const products = await Product.find({ category: category._id });
        console.log(products)
        
       
        const hasProductOffer = products.every(product => product.productOffer > percentage);
        if (hasProductOffer) {
            return res.json({ status: false, message: "Product in this category already has a higher offer" });
        }
        
        
        await Category.updateOne({ _id: categoryId }, { $set: { categoryOffer: percentage } });
        
        
        for (const product of products) {
            if(product.productOffer<percentage){
                product.salePrice = Math.ceil(product.salePrice / (1 - (product.productOffer/ 100)));
                product.productOffer = percentage;
                product.salePrice -= Math.ceil(product.salePrice * (percentage/100));
            await product.save();
            }
        }
        
        res.json({ status: true });
    } catch (error) {
        res.status(500).json({ status: false, message: "Internal server error" });
        console.error(error);
    }
};


const removeCategoryOffer = async (req,res) => {
    try {
        console.log("hi")
        const categoryId = req.body.categoryId;
        const category = await Category.findById(categoryId);
        console.log(category);
        
        if(!category){
            return res.status(404).json({status:false , message:"Category not found"})
        }
        const percentage = category.categoryOffer;
        console.log(percentage);
        
        const products = await Product.find({category:category._id});

        if(products.length > 0){
            for(const product of products){
                if(product.productOffer <=percentage && Math.ceil(product.salePrice/(1-(percentage/100))) == Math.ceil(product.salePrice/(1-(product.productOffer/100)))){
                product.salePrice = Math.ceil(product.salePrice/(1-(percentage/100)));
                product.productOffer = 0;
                await product.save()
                }
            }
        }
        category.categoryOffer = 0;
        await category.save();
        res.json({status:true});

    } catch (error) {
        res.status(500).json({status:false,message:"Internal server error"});
        console.log(error)

    }
}

const getlistCategory = async(req,res)=>{
    try {
        let {id} = req.body;
        const data=await Category.findById({_id:id});
        if(data.isListed == true){
            await Category.updateOne({_id:id},{$set:{isListed:false}})
            res.json({success:true,message:"category listed"})
        }else{
            await Category.updateOne({_id:id},{$set:{isListed:true}});
            res.json({success:true,message:"category unlisted"})
        }
    } catch (error) {
        console.log(error)
        
    }
}

const getEditCategory=async (req,res) => {
    try {
        const id = req.query.id;
        const category=await Category.findById({_id:id});
        if(category){
            res.render("edit-category",{category:category,activePage: 'category'})
        }
    } catch (error) {
        console.log(error);
        
        
    }
}
const EditCategory = async (req, res) => {
    try {
        const id = req.query.id;
        const { name, description } = req.body;
    
        const existingCategory = await Category.findOne({ name: { $regex: `^${name}$`, $options: "i" } });
        if (existingCategory) {
            return res.status(400).json({ status: false, message: "Category exists. Please choose another name" });
        }

        const updateCategory = await Category.findByIdAndUpdate(id, { $set: { name: name, description: description } }, { new: true });
        if (updateCategory) {
            return res.json({ status: true, message: "Category updated successfully" });
        } else {
            return res.json({ status: false, message: "Category not found" });
        }
        } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: "Internal server error" });
        }
    };
module.exports={
    categoryInfo,
    addCategory,
    addCategoryOffer,
    removeCategoryOffer,
    getlistCategory,
    getEditCategory,
    EditCategory
   

}
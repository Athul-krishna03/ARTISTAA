const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Brand = require("../../models/brand");
const User = require("../../models/userSchema");
const fs = require("fs");
const path =require("path");
const sharp  = require("sharp"); 

const getProductAddPage= async (req,res) => {
    try {
        const category = await Category.find({isListed:true});
        const brand = await Brand.find({isBlocked:false});
        res.render("product-add",{category:category,brand:brand,activePage: 'addProducts'})
    } catch (error) {
        console.log("error in product adding",error);
    }
}
const addProducts = async (req,res) => {
    try {
        const products = req.body;
        const productExists = await Product.findOne({
            productName:products.productName
        });
        if(!productExists){
            const images = req.files.map((file) => file.path);

            const category = await Category.findOne({name:products.category});
            console.log(category)

            if(!category){
                return res.status(400).join("Invaild category name");

            }


            const newproduct = new Product({
                productName:products.productName,
                description:products.description,
                brand:products.brand,
                category:category._id,
                regularPrice:products.regularPrice,
                salePrice:products.salePrice,
                createdOn:new Date(),
                quantity:products.quantity,
                size:products.size,
                color:products.color,
                productImage:images,
                status:'Available',
                


            });

            await newproduct.save();
            console.log("product saved successfully");
            return res.redirect("/admin/products");
        }else{
            return res.status(400).json("Product already.Please try with another name");

        }
    } catch (error) {
        console.log("Error in saving products",error);
        
    }
}
const getAllProducts = async (req, res) => {
    try {
        const search = req.query.search || "";
        const page = parseInt(req.query.page) || 1;
        const limit = 4;

        const query = {
        $or: [
            { productName: { $regex: search, $options: "i" } },
            { brand: { $regex: search, $options: "i" } }
        ]
        };

        const [products, count] = await Promise.all([
        Product.find(query)
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip((page - 1) * limit)
            .populate("category"),

        Product.countDocuments(query)
        ]);

        const totalPages = Math.ceil(count / limit);

        if (req.headers.accept?.includes("application/json")) {
        return res.json({ data: products, currentPage: page, totalPages });
        }

        const category = await Category.find({ isListed: true });
        const brand = await Brand.find({ isBlocked: false });

        if (category && brand) {
        res.render("products", {
            data: products,
            currentPage: page,
            totalPages,
            cat: category,
            brand: brand,
            activePage: "products"
        });
        } else {
        res.render("pageerror");
        }
    } catch (error) {
        console.log("Product listing error:", error);
        res.redirect("/pageerror");
    }
};


const addProductOffer = async(req,res)=>{
    try {
        console.log(req.body)
        const {productId,percentage} = req.body;
        const findProduct = await Product.findById({_id:productId});
        const findCategory= await Category.findOne({_id:findProduct.category});
        if(findCategory.categoryOffer > percentage){
            return res.json({status:false,message:"This product category has already a higher offer"})
        }

        findProduct.salePrice -= Math.ceil(findProduct.salePrice*(percentage/100));
        findProduct.productOffer = parseInt(percentage);
        await findProduct.save();
        findCategory.categoryOffer = 0;
        await findCategory.save();
        res.json({status:true});
    } catch (error) {
        res.status(500).json({status:false,message:"Internal Server error"})
        console.log("add product offer error",error);
        
    }
}

const removeProductOffer = async (req,res) => {
    try {
        const {productId} = req.body;
        const findProduct = await Product.findById({_id:productId});
        const percentage = findProduct.productOffer;
        findProduct.salePrice = Math.ceil(findProduct.salePrice / (1 - (percentage / 100)));
        findProduct.productOffer = 0;
        await findProduct.save();
        res.json({status:true});        
    

    } catch (error) {
        
        console.log(error);
        
    }
}

const blockProduct =async(req,res)=>{
    try {
        let {id} = req.body;
        console.log(id)
        const data=await Product.findById({_id:id});
        console.log(data)
        if(data.isBlocked === true){
            await Product.updateOne({_id:id},{$set:{isBlocked:false}})
            res.json({success:true,message:"unblock the product"})
        }else{
            await Product.updateOne({_id:id},{$set:{isBlocked:true}});
            res.json({success:true,message:"block the product"})
        }
    } catch (error) {
        console.log(error)
        
    }
}
const getEditProduct = async (req,res) => {
    try {
        const id = req.query.id;
        const product = await Product.findById({_id:id}).populate('category');
        const category = await Category.find({});
        const brand = await Brand.find({});
        res.render("edit-product",{
            product:product,
            category:category,
            brand:brand,
            activePage: 'products'
        });
    } catch (error) {
        // res.redirect("/pageerror")
        console.log(error);
        
    }
}

const editProduct = async (req,res) => {
    try {
        console.log("data ",req.body)
        const id = req.query.id;
        const product= await Product.findById({_id:id});
        const data=req.body;
        const existingProduct = await Product.findOne({productName:data.productName,_id:{$ne:id}})

        if(existingProduct){
            return res.status(400).json({error:"Product with this name already exist"});
        }
        // const images = [];

        // if(req.files && req.files.length > 0){
        //     for(let i=0;i<req.files.length;i++){
        //         images.push(req.files[i].filename);
        //     }
        // }
        const images = req.files.map((file) => file.path);
        const updateFields ={
            productName:data.productName,
            description:data.descriptionData,
            brand:data.brand,
            category:product.category,
            regularPrice:data.regularPrice,
            salePrice:data.salePrice,
            quantity:data.quantity,
            size:data.size, 
            color:data.color
        }
        if(req.files.length>0){
            updateFields.$push ={productImage:{$each:images}}
        }

        const updating=await Product.findByIdAndUpdate(id,updateFields,{new:true});
        console.log(updating)
        if(updating){
            return  res.redirect("/admin/products");

        }
    
    } catch (error) {
        console.log("edit product error",error);
    }
}

const deleteSingleImage = async (req,res) => {
    try {
        console.log(req.body)
        const {imageNameToServer,productIdToServer} = req.body;
        const product = await Product.findByIdAndUpdate(productIdToServer,{$pull:{productImage:imageNameToServer}});
        const imagePath  = path.join("public","uploads","re-image",imageNameToServer);
        if(fs.existsSync(imagePath)){
            await fs.unlinkSync(imagePath);
            console.log(`image ${imageNameToServer} deleted successfully`);
            
        } else{
            console.log("image not found")
        }
        res.send({status:true});    
    } catch (error) {
        console.log("deletesingle image error",error)
    }
}

const stockDetials = async (req,res) => {
    try {
        const products = await Product.find().populate("category")
        return res.render("stockManagment",{products:products,activePage: 'stock'})
    } catch (error) {
        console.log("stock update error",error);
        
    }
}

const updateStock = async (req, res) => {
    const { productId, newStock } = req.body;
    const stock = parseInt(newStock);

    try {
        const update = await Product.findByIdAndUpdate(productId, { $set: { quantity: stock } });
        if (update) {
            res.json({ success: true, message: 'Stock updated successfully' });
        } else {
            res.json({ success: false, message: 'Failed to update stock' });
        }
    } catch (err) {
        res.json({ success: false, message: 'Error occurred during stock update' });
    }
};
module.exports={
    getProductAddPage,
    addProducts,
    getAllProducts,
    addProductOffer,
    removeProductOffer,
    blockProduct,
    getEditProduct,
    editProduct,
    deleteSingleImage,
    stockDetials,
    updateStock

}
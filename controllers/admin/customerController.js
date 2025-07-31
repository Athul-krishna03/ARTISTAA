const User=require("../../models/userSchema");
const { login } = require("./adminControllers");

const customerInfo=async (req,res) => {
    try {
        let search = "";
        if(req.query.search){
            search=req.query.search;
        }
        let page=1;
        if(req.query.page){
            page=req.query.page
        }
        const limit=5;
        const userData = await User.find({
            isAdmin:false,
            $or:[
                {name:{$regex:".*"+search+".*"}},
                {email:{$regex:".*"+search+".*"}}
            ],
        })
        .limit(limit*1)
        .skip((page-1)*limit)
        .exec();
        const count=await User.find({
            isAdmin:false,
            $or:[
                {name:{$regex:".*"+search+".*"}},
                {email:{$regex:".*"+search+".*"}}
            ],
        }).countDocuments();
        res.render("customers",{data:userData,totalPages:Math.ceil(count/limit),currentPage:page,activePage: 'customer' })
        
    } catch (error) {
        console.log(error);
        
    }
}

const customerBlocked=async (req,res) => {
    try {
        let {id} = req.body;
        const user=await User.findById({_id:id});
        
        if(user.isBlocked){
            await User.updateOne({_id:id},{$set:{isBlocked:false}});
            res.json({success:true,message:"User unblocked"})
        }else{
            await User.updateOne({_id:id},{$set:{isBlocked:true}});
            res.json({success:true,message:"User blocked"})
        }
    } catch (error) {
        console.log(error.message);
        
        
    }
}

module.exports={
    customerInfo,
    customerBlocked
}
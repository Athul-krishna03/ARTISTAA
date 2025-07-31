const User=require("../../models/userSchema");
const { login } = require("./adminControllers");

const customerInfo = async (req, res) => {
    try {
        let search = req.query.search || "";
        let page = parseInt(req.query.page) || 1;
        const limit = 5;

        const query = {
            isAdmin: false,
            $or: [
                { name: { $regex: ".*" + search + ".*", $options: "i" } },
                { email: { $regex: ".*" + search + ".*", $options: "i" } }
            ]
        };

        const userData = await User.find(query)
            .limit(limit)
            .skip((page - 1) * limit)
            .exec();

        const count = await User.countDocuments(query);

        const responseData = {
            data: userData,
            totalPages: Math.ceil(count / limit),
            currentPage: page
        };

        if (req.xhr || req.headers.accept.includes('application/json') ||  req.headers.accept.indexOf('json') > -1) {
            return res.json(responseData);
        } else {
            return res.render("customers", {
                data: userData,
                totalPages: responseData.totalPages,
                currentPage: page,
                activePage: 'customer'
            });
        }

    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
};


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
const User = require("../../models/userSchema");
const Order = require("../../models/orderSchema");
const Address = require("../../models/addressSchema");


const getOrderDetails = async (req,res) => {
    try {
        const orders = await Order.find().sort({createdOn:-1}).populate("userId");
        console.log(orders)
        if(orders){
            return res.render("orderManagement",{orders:orders})
        }
    } catch (error) {
        console.log(error,"error in getting order detials")
    }
}


module.exports ={
    getOrderDetails
}
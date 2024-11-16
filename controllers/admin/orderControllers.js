const User = require("../../models/userSchema");
const Order = require("../../models/orderSchema");
const Address = require("../../models/addressSchema");


const getOrderDetails = async (req, res) => {
    try {
        const orders = await Order.find().sort({ createdOn: -1 },{new:true}).populate("userId");
        console.log(orders)
        if (orders) {
            return res.render("orderManagement", { orders: orders ,activePage: 'orders'})
        }
    } catch (error) {
        console.log(error, "error in getting order detials")
    }
}

const updateStatus = async (req, res) => {
    try {
        const { id, status } = req.query;
        if (!id || !status) {
            return res.status(400).send("Order ID and status are required.");
        }

        const updatedOrder = await Order.findByIdAndUpdate(id,{ $set: { status } },{ new: true } );

        if (updatedOrder) {
            return res.redirect("/admin/orders");
        } else {
            return res.status(404).send("Order not found.");
        }
    } catch (error) {
        console.error("Error in updating status:", error);
        return res.status(500).send("Internal server error.");
    }
};

const getSalesReport = async (req,res) => {
    try {
        const orderData = await Order.find().populate("userId").populate("orderedItems.product");
        const count = await Order.find().countDocuments();
        console.log(orderData)
        if(orderData){
            res.render("salesreport",{orders:orderData,activePage:"sales-report",count:count})
        }
    } catch (error) {
        console.log(error)
    }
}

module.exports = {
    getOrderDetails,
    updateStatus,
    getSalesReport
}
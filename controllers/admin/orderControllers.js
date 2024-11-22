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
const getOrderDetailsView = async (req, res) => {
    try {

        const orderId = req.query.id;
        const orderDetails = await Order.findOne({ orderId: orderId })
            .populate('orderedItems.product')
            .lean();

        if (!orderDetails) {
            return res.status(404).render("pageNotFound");
        }

        const addresses = await Address.findOne({ userId: orderDetails.userId });

        const address = addresses?.address.find(address => address._id.toString() === orderDetails.address.toString());

        res.render("orderView", {
            order: orderDetails,
            address: address || {},
            activePage:"orders"

        });
    } catch (error) {
        console.error('Error retrieving order details:', error);
        res.status(500).redirect("/pageNotFound");
    }
};
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
        const page= (req.query.page) || 1;
        const limit = 10;
        const skip = (page-1)*limit;
        const orderData = await Order.find().populate("userId").populate("orderedItems.product").sort({createdOn:-1}).skip(skip).limit(limit);
        const count = await Order.countDocuments();
        const totalPages =Math.ceil(count/limit);

        console.log(orderData)
        if(orderData){
            res.render("salesreport",{orders:orderData,activePage:"sales-report",count:count,totalPages,page})
        }
    } catch (error) {
        console.log(error)
    }
}

module.exports = {
    getOrderDetails,
    updateStatus,
    getSalesReport,
    getOrderDetailsView
}
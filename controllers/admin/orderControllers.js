const User = require("../../models/userSchema");
const Order = require("../../models/orderSchema");
const Address = require("../../models/addressSchema");
const Return = require("../../models/returnSchema");
const Wallet = require("../../models/walletSchema");


const getOrderDetails = async (req, res) => {
    try {
        const { status, name } = req.query;
        const filter = {};
        if (status) {
            filter.status = status;
        }

        const orders = await Order.find(filter)
            .sort({ createdOn: -1 })
            .populate({
                path: "userId",
                match: name ? { username: { $regex: name, $options: "i" } } : {}, 
            });

        const filteredOrders = orders.filter((order) => order.userId !== null);
        return res.render("orderManagement", {
            orders: filteredOrders,
            activePage: "orders",
        });
    } catch (error) {
        console.error("Error in getting order details:", error.message);
        return res.status(500).send("Internal Server Error");
    }
};

const getOrderDetailsView = async (req, res) => {
    try {
        console.log(req.query)
        const orderId = req.query.id;
        const orderDetails = await Order.findById({ _id: orderId })
            .populate('orderedItems.product')
            .lean();

        if (!orderDetails) {
            return res.status(404).render("pageNotFound");
        }


        const address = orderDetails.shippingAddress;
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
        console.log("sales Data",orderData)
        const count = await Order.countDocuments();
        const totalPages =Math.ceil(count/limit);
        if(orderData){
            res.render("salesreport",{orders:orderData,activePage:"sales-report",count:count,totalPages,page})
        }
    } catch (error) {
        console.log(error)
    }
}

const getReturnRequest = async (req,res) => {
    try {
        const returnRequests= await Return.find().populate("userId")
        if(returnRequests){
        return res.render('returnRequestPage',{returnRequests:returnRequests,activePage:"return"})
        }
    } catch (error) {
        console.log("return request page load error",error);
        res.status(404).redirect("/pageNotFound");
    }
}
const updateReturnRequest=async (req,res) => {
    try {
    const { requestId, status } = req.body;
    const requestData = await Return.findByIdAndUpdate({_id:requestId},{$set:{status:status}});
    if(requestData){
        const walletData = await Wallet.findOne({"transactions.orderId":requestData.orderId});
        if(!walletData && status=="Approved"){
            const orderData = await Order.findById({_id:requestData.orderId});
            const newWallet  = {
                $inc:{balance:orderData.finalAmount},
                $push:{
                    transactions:{
                        type:"Refund",
                        amount:orderData.finalAmount,
                        orderId:orderData._id
                    }
                }
            }
            const walletUpdate = await Wallet.findOneAndUpdate({userId:requestData.userId},newWallet,{upsert:true,new:true})
            if(walletUpdate){
                return res.status(200).json({success:true});
            }
            console.log("error in wallet update");
            return res.status(400).json({success:false});
        };
    }
    return res.status(200).json({success:true});
    } catch (error) {
        console.log("update request error",error);
    }
}

module.exports = {
    getOrderDetails,
    updateStatus,
    getSalesReport,
    getOrderDetailsView,
    getReturnRequest,
    updateReturnRequest
}
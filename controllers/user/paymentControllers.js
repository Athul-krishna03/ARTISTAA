const Razorpay = require('razorpay');
const Order = require("../../models/orderSchema");
const Product = require("../../models/productSchema")
require("dotenv").config();
const crypto = require('crypto');
const redis = require('../../helpers/redisClient');
const User = require("../../models/userSchema");

const razorpay = new Razorpay({
key_id:"rzp_test_fu3JZWbM4Hq2Jt",
key_secret:"Kw2OGnMFs469euAjIysokWgM"
});


const createPayment = async (req, res) => {
    const userId = req.session.user
    const lockKey = `lock:order:${userId}`;
    const { amount } = req.body;
    const amt = Number(amount)
    const options = {
        amount: amt * 100,
        currency: 'INR',
        receipt: 'receipt#1',
    };
    console.log(options)

    try {
        const order = await razorpay.orders.create(options);
        return res.json({ success: true, orderId: order.id });
    } catch (error) {
        await redis.del(lockKey)
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to create order' });
    }
}

const updatePaymentStatus = async (req, res) => {
    const user = await User.findById({ _id: req.session.user });
    const lockKey = `lock:order:${user._id}`;
    try {

        const { paymentId, orderId,razorpayId, signature,status } = req.body;
        console.log(req.body)
        const generatedSignature = crypto.createHmac('sha256',"Kw2OGnMFs469euAjIysokWgM" )
            .update(razorpayId + "|" + paymentId)
            .digest('hex');
        console.log("generatedSignature:",generatedSignature,"signature:",signature)
        await redis.del(lockKey)
        if (generatedSignature !== signature) {
            const order = await Order.findOneAndUpdate(
                { _id: orderId },
                { payment_status: 'Payment failed'},
                { new: true }
            );
            console.log("fail")
            if (!order) {
                return res.status(404).json({ success: false, message: 'Order not found.' });
            }else{
                return res.status(400).json({ success: false, message: 'Payment  failed!' });
            }
            
        }                                                                                                        
        const order = await Order.findOneAndUpdate(
            { _id: orderId },
            { payment_status: status},
            { new: true }
        );
        if(order && order.orderedItems.length>0){
            for (const item of Object.values(order.orderedItems)) {
                await Product.findByIdAndUpdate(
                    { _id: item.product },
                    { $inc: { quantity: -item.quantity } }
                );
            }
        }
        console.log("success order",order)
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found.' });
        }

        return res.status(200).json({ success: true, orderId: order._id });
    } catch (error) {
        console.error('Error updating payment:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
}
const retryPayment = async (req, res) => {
    const { orderId, amount } = req.body;

    try {
        const options = {
            amount: amount * 100, 
            currency: 'INR',
            receipt: `retry_${orderId}`,
        };

        const razorpayOrder = await razorpay.orders.create(options);
        res.json({
            success: true,
            razorpayOrderId: razorpayOrder.id,
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency,
            key: process.env.RAZORPAY_KEY_ID, 
            orderId, 
        });
    } catch (error) {
        console.error('Error retrying payment:', error);
        res.status(500).json({ success: false, message: 'Failed to retry payment' });
    }
};
const ondismiss = async (req,res) => {
    try {
        console.log("query orderId in dismisssal function",req.body)
        const userId = req.session.user
        const lockKey = `lock:order:${userId}`;
        const orderId = req.body.orderId;
        const orderData = await Order.findByIdAndDelete({_id:orderId});
        await redis.del(lockKey)
        console.log("order Data",orderData)
        return res.status(200).json({success:true})
    } catch (error) {
        console.log(error);
        
    }
}



module.exports = {
    createPayment,
    updatePaymentStatus,
    retryPayment,
    ondismiss
}
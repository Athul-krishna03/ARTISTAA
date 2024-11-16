const Razorpay = require('razorpay');
require("dotenv").config();

const razorpay = new Razorpay({
    key_id:process.env.key_id,
    key_secret:process.env.key_secret
});


const createPayment = async (req, res) => {
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
        res.json({ success: true, orderId: order.id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to create order' });
    }
}

module.exports ={
    createPayment
}
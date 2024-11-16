const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Order = require("../../models/orderSchema");
const Address = require("../../models/addressSchema");
const Coupon = require("../../models/couponSchema");
const { loadShopping } = require("./userController");
const Wallet = require("../../models/walletSchema");
const { Transaction } = require("mongodb");
const { trusted } = require("mongoose");




const createOrder = async (req, res) => {
    try {
        const user = await User.findById({ _id: req.session.user });
        const { singleProduct, cart, totalPrice, discount, finalAmount, address, couponCode, payment_option, cartData, singleProductId, singleProductQuantity } = req.body;
        
        if (cartData && Object.values(cartData).length > 0) {
            for (const item of Object.values(cartData)) {
                const productId = item.productId;
                const quantity = item.quantity;
                await Product.findByIdAndUpdate(
                    { _id: productId },
                    { $inc: { quantity: -quantity } }
                );
                console.log(`Cart Product ID: ${productId}, Quantity: ${quantity}`);
            }
        }
        if (singleProductId && singleProductQuantity) {
           
            const quantity = parseInt(singleProductQuantity, 10);
            await Product.findByIdAndUpdate(
                { _id: singleProductId },
                { $inc: { quantity: -quantity } } 
            );
            console.log(`Single Product ID: ${singleProductId}, Quantity: ${quantity}`);
        }

        let orderedItems = [];
        let product = singleProduct ? JSON.parse(singleProduct) : null;
        let cartItems = cart ? JSON.parse(cart) : [];
        if (product) {
            orderedItems.push({
                product: product._id,
                quantity: 1,
                totalPrice: product.salePrice,
            });
        } else if (cartItems && cartItems.length > 0) {
            orderedItems = cartItems.map(item => ({
                product: item.productId,
                quantity: item.quantity,
                totalPrice: item.totalPrice,
            }));
        } else {
            return res.status(400).send("No products selected for the order.");
        }
        
        console.log("tp:", totalPrice, "dis:", discount);
        const newOrder = new Order({
            userId: user._id,
            orderedItems,
            totalPrice,
            discount,
            finalAmount,
            address,
            paymentMethod: payment_option,
            couponCode,
            couponApplied:couponCode ? true:false,
            status: 'Pending',
            createdOn: Date.now(),
            invoiceDate: new Date()
        });

        await newOrder.save();
        user.orderHistory.push(newOrder._id);
        await user.save();
        console.log("saved");
        
       
        return res.render("orderSuccess", { orderId: newOrder._id });
       
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).send('Internal Server Error');
    }
};

const getOrderDetails = async (req, res) => {
    try {

        const orderId = req.query.id;
        const orderDetails = await Order.findOne({ orderId: orderId })
            .populate('orderedItems.product')
            .lean();

        if (!orderDetails) {
            return res.status(404).render("pageNotFound");
        }

        const addresses = await Address.findOne({ userId: req.session.user });

        const address = addresses?.address.find(address => address._id.toString() === orderDetails.address.toString());

        res.render("viewOrder", {
            order: orderDetails,
            address: address || {},

        });
    } catch (error) {
        console.error('Error retrieving order details:', error);
        res.status(500).redirect("/pageNotFound");
    }
};

const cancelOrder = async (req, res) => {
    try {
        const userId=req.session.user
        const orderId = req.query.id;
        const updateStatus = await Order.findOneAndUpdate(
            { _id: orderId },
            { $set: { status: "Cancelled" } }
        );
        const walletData = await Wallet.findOne({"transactions.orderId":orderId});
        if(!walletData){
            const orderData = await Order.findOne({ _id: orderId })
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
            const walletUpdate = await Wallet.findOneAndUpdate(
                {userId:userId},
                newWallet,{upsert:true,new:true})

            };
        

        if (updateStatus) {
            return res.json({ success: true, message: "Order cancelled successfully", orderId });

        } else {
            return res.json({ success: false, message: "Order not found" });
        }
    } catch (error) {
        console.error("cancelOrder error", error);
        return res.status(500).json({ success: false, message: "An error occurred" });
    }
};

const applyCoupon = async (req, res) => {
    try {
        console.log(req.body)
        const { couponCode, totalPrice } = req.body;
        const total  = Number(totalPrice);
        console.log(total)
        const coupon = await Coupon.findOne({ code: couponCode });
        
        if (!coupon) {
            return res.status(400).json({ success: false, message: "Coupon not Found" })
        }
        if (new Date() > coupon.expireOn) {
            return res.status(400).json({ success: false, message: "coupon is expired" })
        }
        if (totalPrice < coupon.minimumPrice) {
            return res.status(400).json({ success: false, message: `Minimum spend of ${coupon.minimumPrice} required to apply this coupon.` });
        }
        const discountAmount = (total * coupon.offerPercentage) / 100;
        const newTotal = total - discountAmount;

        // coupon.userId.push(req.user._id);
       console.log("dis",discountAmount,"total",newTotal)
        return res.status(200).json({
            success: true,
            discountAmount: discountAmount,
            newTotal: newTotal
        });
    } catch (error) {
        console.log("coupon apply error", error)
    }
}



module.exports = {
    createOrder,
    getOrderDetails,
    cancelOrder,
    applyCoupon,
    
}
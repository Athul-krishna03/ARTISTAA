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

        if (couponCode) {
            const coupon = await Coupon.findOne({ code: couponCode });
            if (coupon) {
                if (coupon.userId.includes(user._id)) {
                    return res.status(400).send("You have already used this coupon.");
                }
                await Coupon.findOneAndUpdate(
                    { code: couponCode },
                    { $push: { userId: user._id } }
                );
            }
        }

        if (cartData && Object.values(cartData).length > 0) {
            for (const item of Object.values(cartData)) {
                await Product.findByIdAndUpdate(
                    { _id: item.productId },
                    { $inc: { quantity: -item.quantity } }
                );
            }
        }

        if (singleProductId && singleProductQuantity) {
            await Product.findByIdAndUpdate(
                { _id: singleProductId },
                { $inc: { quantity: -parseInt(singleProductQuantity, 10) } }
            );
        }

        let orderedItems = [];
        if (singleProduct) {
            const product = JSON.parse(singleProduct);
            orderedItems.push({
                product: product._id,
                quantity: 1,
                totalPrice: product.salePrice,
            });
        } else if (cart) {
            const cartItems = JSON.parse(cart);
            orderedItems = cartItems.map(item => ({
                product: item.productId,
                quantity: item.quantity,
                totalPrice: item.totalPrice,
            }));
        }

        const newOrder = new Order({
            userId: user._id,
            orderedItems,
            totalPrice,
            discount,
            finalAmount,
            address,
            paymentMethod: payment_option,
            couponCode,
            couponApplied: couponCode ? true : false,
            status: 'Pending',
            createdOn: Date.now(),
            invoiceDate: new Date(),
        });

        await newOrder.save();
        user.orderHistory.push(newOrder._id);
        await user.save();


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
        if(coupon.userId.includes(req.session.user)){
            return res.status(400).json({ success: false, message: "coupon is  already used" })
        }
        if (new Date() > coupon.expireOn) {
            return res.status(400).json({ success: false, message: "coupon is expired" })
        }
        if (totalPrice < coupon.minimumPrice) {
            return res.status(400).json({ success: false, message: `Minimum spend of ${coupon.minimumPrice} required to apply this coupon.` });
        }
        const discountAmount = (total * coupon.offerPercentage) / 100;
        const newTotal = total - discountAmount;

        
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
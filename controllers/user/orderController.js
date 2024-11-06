const User = require("../../models/userSchema");
const Order = require("../../models/orderSchema");
const Address = require("../../models/addressSchema");




const createOrder = async (req, res) => {
    try {
        const user = await User.findById({_id:req.session.user});
        const { singleProduct, cart, totalPrice, discount, finalAmount, address, couponApplied , payment_option } = req.body;
        console.log(req.body.payment_option);
        
        
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
        const newOrder = new Order({
            userId:user._id,
            orderedItems,
            totalPrice,
            discount,
            finalAmount,
            address,
            paymentMethod:payment_option,
            couponApplied,
            status: 'Pending',
            createdOn: Date.now(),
            invoiceDate: new Date()
        });

        await newOrder.save();
        user.orderHistory.push(newOrder._id);
        await user.save();

        res.render("orderSuccess", { orderId: newOrder._id, user });
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).send('Internal Server Error');
    }
};

const getOrderDetails = async (req, res) => {
    try {
        const user = await User.findById(req.session.user)
        const orderId = req.query.id;
        const orderDetails = await Order.findById(orderId)
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
            user:user
        });
    } catch (error) {
        console.error('Error retrieving order details:', error);
        res.status(500).redirect("/pageNotFound");
    }
};

const cancelOrder = async (req, res) => {
    try {
        const orderId = req.query.id;
        const updateStatus = await Order.findOneAndUpdate(
            { _id: orderId },
            { $set: { status: "Cancelled" } }
        );

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


module.exports={
    createOrder,
    getOrderDetails,
    cancelOrder
}
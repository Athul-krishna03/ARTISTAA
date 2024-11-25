const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Order = require("../../models/orderSchema");
const Address = require("../../models/addressSchema");
const Coupon = require("../../models/couponSchema");
const { loadShopping } = require("./userController");
const Wallet = require("../../models/walletSchema");
const Return = require("../../models/returnSchema");
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { Transaction } = require("mongodb");
const { trusted } = require("mongoose");




const createOrder = async (req, res) => {
    try {
        const user = await User.findById({ _id: req.session.user });
        const data=req.body.formData?req.body.formData:req.body;
        console.log("create order data:",data)
        const { singleProduct, cart, totalPrice, discount, finalAmount, address, couponCode, payment_option, cartData, singleProductId, singleProductQuantity } = data;

      
        if (couponCode) {
            const coupon = await Coupon.findOne({ code: couponCode });
            if (coupon) {
                if (coupon.userId.includes(user._id)) {
                    return res.status(400).json({success:"false",message:"You have already used this coupon."});
                }
                await Coupon.findOneAndUpdate(
                    { code: couponCode },
                    { $push: { userId: user._id } }
                );
            }
            console.log("coupon applied");
            
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
        const product = singleProduct ? JSON.parse(singleProduct):null;
        if (product && product._id) {
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
        let payment_status;
        if(payment_option=="COD"){
            payment_status = "COD"
            
        }else{
            payment_status = "pending"
        }

        const newOrder = new Order({
            userId: user._id,
            orderedItems,
            totalPrice:(Number(totalPrice)+40),
            discount,
            finalAmount,
            address,
            paymentMethod: payment_option,
            payment_status:payment_status,
            couponCode,
            couponApplied: couponCode ? true : false,
            status: 'Pending',
            createdOn: Date.now(),
            invoiceDate: new Date(),
        });
        if(!newOrder){
            console.log("order not placed");
            
        }

        await newOrder.save();
        user.orderHistory.push(newOrder._id);
        await user.save();
        console.log("address of order:",address,"newOrder:",newOrder);

      

        payment_option == "online" ?  res.status(200).json({success:"true",orderId: newOrder._id}):res.render("orderSuccess", { orderId: newOrder._id });


        // return res.render("orderSuccess", { orderId: newOrder._id });
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

const orderSuccess =async (req, res) => {
    const { orderId } = req.query;
    res.render('orderSuccess', { orderId });
}




const getInvoice = async (req, res) => {
    const orderId = req.query.id;
    const formatCurrency = (amount) => {
        return `Rs:${amount.toFixed(2)}`;
    };

    try {
        const order = await Order.findById(orderId)
            .populate('userId', 'name email')
            .populate('orderedItems.product', 'productName salePrice');

        if (!order) {
            return res.status(404).send("Order not found.");
        }

        const doc = new PDFDocument({
            margin: 50,
            size: 'A4',
            font: 'Helvetica'
        });

        const fileName = `invoice-${orderId}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        doc.pipe(res);
        const colors = {
            primary: '#2C3639',
            secondary: '#3F4E4F',
            accent: '#A27B5C',
            highlight: '#DCD7C9',
            text: '#2C3639',
            background: 'white',
            border: '#A27B5C'
        };

        doc.rect(0, 0, doc.page.width, doc.page.height)
            .fill(colors.background);
        for (let i = 0; i < doc.page.width; i += 40) {
            for (let j = 0; j < doc.page.height; j += 40) {
                doc.save()
                    .translate(i, j)
                    .path('M 0,0 L 10,10 M 10,0 L 0,10')
                    .strokeColor(colors.highlight)
                    .opacity(0.1)
                    .stroke()
                    .restore();
            }
        }

        doc.save();
        try {
            const path = require('path');
            const logoPath = path.join(__dirname, '..','..','public', 'uploads', 'banner', 'logoSVG.png');

            ;
            doc.image(logoPath, 70, 70, { width: 60 }) 
                .circle(100, 100, 35)
                .strokeColor(colors.border)
                .lineWidth(0.5)
                .stroke();
        } catch (err) {
            console.error('Error loading logo image:', err);
            doc.circle(100, 100, 30)
                .fill(colors.accent);
            doc.font('Helvetica-Bold')
                .fontSize(40)
                .fillColor('white')
                .text('A', 88, 80);
            doc.circle(100, 100, 35)
                .strokeColor(colors.border)
                .lineWidth(0.5)
                .stroke();
        }
        doc.restore();
        doc.font('Helvetica-Bold')
            .fontSize(24)
            .fillColor(colors.primary)
            .text('ARTISTAA', 150, 85)
            .fontSize(12)
            .font('Helvetica')
            .fillColor(colors.secondary)
            .text('Curating Creativity | Delivering Excellence', 150, 110);
        doc.fontSize(10)
            .text('Artistaa Pvt Ltd', 150, 130)
            .text('123 Art Street, Creative Valley', 150, 145)
            .text('Kochi, Kerala - 400001', 150, 160)
            .text('GSTIN: 27AABCU9603R1ZX', 150, 175);

        doc.moveTo(50, 200)
            .lineTo(550, 200)
            .strokeColor(colors.accent)
            .strokeOpacity(0.4)
            .stroke();

        doc.font('Helvetica-Bold')
            .fontSize(20)
            .fillColor(colors.primary)
            .text('TAX INVOICE', 0, 220, { align: 'center' });
        doc.save()
            .rect(350, 250, 200, 100)
            .fillColor(colors.highlight)
            .fillOpacity(0.3)
            .fill()
            .restore();
        doc.font('Helvetica')
            .fontSize(10)
            .fillColor(colors.text)
            .text(`Invoice No: ART-${orderId.slice(-8)}`, 360, 260)
            .text(`Date: ${new Date(order.createdAt).toLocaleDateString('en-IN')}`, 360, 275)
            .text(`Order ID: ${orderId}`, 360, 290)
            .text(`Payment Status: Paid`, 360, 305);

        doc.font('Helvetica-Bold')
            .fontSize(12)
            .text('BILLED TO:', 50, 250)
            .font('Helvetica')
            .fontSize(10)
            .text(order.userId.name, 50, 270)
            .text(order.userId.email, 50, 285);
        const tableTop = 350;
        doc.save()
            .rect(50, tableTop, 500, 30)
            .fillColor(colors.primary)
            .fill()
            .restore();

        doc.fillColor('white')
            .font('Helvetica-Bold')
            .text('DESCRIPTION', 60, tableTop + 10)
            .text('QTY', 310, tableTop + 10)
            .text('PRICE', 400, tableTop + 10)
            .text('AMOUNT', 490, tableTop + 10);
        let yPosition = tableTop + 40;
        let subtotal = 0;
        order.orderedItems.forEach((item, index) => {
            if (index % 2 === 0) {
                doc.save()
                    .rect(50, yPosition - 5, 500, 25)
                    .fillColor(colors.highlight)
                    .opacity(0.2)
                    .fill()
                    .restore();
            }

            const itemTotal = item.product.salePrice * item.quantity;
            subtotal += itemTotal;

            doc.font('Helvetica')
                .fontSize(10)
                .fillColor(colors.text)
                .text(item.product.productName, 60, yPosition)
                .text(item.quantity.toString(), 310, yPosition)
                .text(formatCurrency(item.product.salePrice), 400, yPosition)
                .text(formatCurrency(itemTotal), 490, yPosition);

            yPosition += 25;
        });

        const delivery = 40;
        const total = subtotal + delivery;

        doc.save()
            .rect(350, yPosition + 10, 200, 100)
            .fillColor(colors.highlight)
            .opacity(0.2)
            .fill()
            .restore();

        doc.font('Helvetica')
            .fontSize(10)
            .text('Subtotal', 360, yPosition + 20)
            .text(formatCurrency(subtotal), 490, yPosition + 20, { align: 'right' })
            .text('Delivery Charge', 360, yPosition + 35)
            .text(formatCurrency(delivery), 490, yPosition + 35, { align: 'right' });

        doc.font('Helvetica-Bold')
            .fontSize(11)
            .fillColor(colors.primary)
            .text('TOTAL', 360, yPosition + 75)
            .text(formatCurrency(total), 490, yPosition + 75, { align: 'right' });
        const footerY = 700;
        doc.save()
            .rect(50, footerY, 500, 60)
            .fillColor(colors.primary)
            .opacity(0.05)
            .fill()
            .restore();

        doc.font('Helvetica')
            .fontSize(9)
            .fillColor(colors.secondary)
            .text('Thank you for supporting independent artists and creators', 0, footerY + 15, { align: 'center' })
            .text('Each purchase contributes to the growth of the artistic community', 0, footerY + 30, { align: 'center' })
            .font('Helvetica-Bold')
            .text('www.artistaa.com', 0, footerY + 45, { align: 'center' });

        doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40)
            .strokeColor(colors.border)
            .opacity(0.3)
            .stroke();

        doc.end();

    } catch (error) {
        console.error("Error generating invoice:", error);
        res.status(500).send("Error generating invoice.");
    }
};


const returnSubmit = async (req,res) => {
    try {
    const userId = req.session.user;
    const {orderId, reason}=req.body;
    const returnData =new Return({
        userId:userId,
        orderId:orderId,
        reason:reason,
        status:"Pending"
    })
    const data = await returnData.save();
    const orderUpdate = await Order.findByIdAndUpdate({_id:orderId},{$set:{status:"Return Request"}})
    
    if(data && orderUpdate){
        return res.status(200).json({success:true});
    }
    return res.status(400).json({success:false})
        
    } catch (error) {
        console.log("error in return submit",error);
        res.status(500).send("Error in returing");
    }
}

module.exports = {
    createOrder,
    getOrderDetails,
    cancelOrder,
    applyCoupon,
    orderSuccess,
    getInvoice,
    returnSubmit
    
}
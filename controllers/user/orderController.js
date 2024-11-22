const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Order = require("../../models/orderSchema");
const Address = require("../../models/addressSchema");
const Coupon = require("../../models/couponSchema");
const { loadShopping } = require("./userController");
const Wallet = require("../../models/walletSchema");
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
            totalPrice,
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

    try {
        // Fetch order details with user and product information
        const order = await Order.findById(orderId)
            .populate('userId', 'name email') // Populates user's name and email
            .populate('orderedItems.product', 'productName salePrice'); // Populates product details

        if (!order) {
            return res.status(404).send("Order not found.");
        }

        const doc = new PDFDocument({ margin: 50, size: 'A4' });

        // Set headers for PDF download
        const fileName = `invoice-${orderId}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

        // Pipe the PDF document to the response
        doc.pipe(res);

        // Sophisticated Color Palette
        const colors = {
            primary: '#1A2238',     // Deep Navy Blue
            secondary: '#16213E',   // Darker Navy
            accent: '#0F3460',      // Rich Blue
            highlight: '#E94560',   // Vibrant Coral Red
            text: '#0F1123',        // Almost Black
            background: '#F5F5F5',  // Light Gray Background
            border: '#414757'       // Slate Gray
        };

        // Background Watermark Effect
        doc.save()
            .fillColor(colors.background)
            .rect(50, 50, 500, 700)
            .fill()
            .restore();

        // Decorative Header
        doc.lineWidth(0.5)
            .fillColor(colors.primary)
            .rect(50, 50, 500, 80)
            .fill();

        // Company Details with Elegant Typography
        doc.fillColor('white')
            .font('Helvetica-Bold')
            .fontSize(16)
            .text('ARTISTAA', 70, 75)
            .font('Helvetica')
            .fontSize(10)
            .text('Pvt Ltd | Innovative Designs', 70, 95)
            .text('GST: 07AATCA2480C1Z0', 70, 110, { color: colors.highlight });

        // Invoice Header with Subtle Design
        doc.fillColor(colors.text)
            .font('Helvetica-Bold')
            .fontSize(24)
            .text('TAX INVOICE', 0, 180, { align: 'center' });

        // Elegant Invoice Details Box
        doc.strokeColor(colors.border)
            .lineWidth(1)
            .rect(350, 230, 210, 120)
            .stroke();

        doc.fillColor(colors.text)
            .font('Helvetica')
            .fontSize(10)
            .text(`Invoice Number: INV-${orderId.slice(-8)}`, 360, 240)
            .text(`Date: ${new Date(order.createdAt).toLocaleDateString('en-IN')}`, 360, 255)
            .text(`Order ID: ${orderId}`, 360, 270)
            .text(`Payment Status: Paid`, 360, 285);

        // Billing Details with Elegant Formatting
        doc.font('Helvetica-Bold')
            .fontSize(12)
            .fillColor(colors.primary)
            .text(`Bill To:`, 50, 280)
            .font('Helvetica')
            .fontSize(10)
            .fillColor(colors.text)
            .text(`${order.userId.name || 'Customer'}`, 50, 300)
            .text(`Email: ${order.userId.email}`, 50, 315);

        // Table with Sophisticated Design
        const tableTop = 380;
        doc.font('Helvetica-Bold')
            .fontSize(10)
            .fillColor('white')
            .fillColor(colors.accent)
            .rect(50, tableTop - 20, 500, 25)
            .fill();

        doc.fillColor('white')
            .text('Description', 50, tableTop - 15)
            .text('Quantity', 300, tableTop - 15)
            .text('Unit Price (₹)', 400, tableTop - 15)
            .text('Total (₹)', 500, tableTop - 15);

        // Table Rows
        doc.font('Helvetica')
            .fontSize(10)
            .fillColor(colors.text);

        let yPosition = tableTop + 20;
        let subtotal = 0;

        order.orderedItems.forEach(item => {
            const itemTotal = item.product.salePrice * item.quantity;
            subtotal += itemTotal;

            doc.text(item.product.productName, 50, yPosition)
                .text(item.quantity.toString(), 300, yPosition)
                .text(`₹${item.product.salePrice.toFixed(2)}`, 400, yPosition)
                .text(`₹${itemTotal.toFixed(2)}`, 500, yPosition);

            yPosition += 20;
        });

        // Total Calculation with Highlight
        doc.lineWidth(1)
            .strokeColor(colors.border)
            .moveTo(50, yPosition + 10)
            .lineTo(550, yPosition + 10)
            .stroke();

        doc.font('Helvetica-Bold')
            .fillColor(colors.highlight)
            .fontSize(12)
            .text('Subtotal', 400, yPosition + 20)
            .text(`₹${subtotal.toFixed(2)}`, 500, yPosition + 20);

        // GST Calculation
        const tax = subtotal * 0.18;
        doc.fillColor(colors.text)
            .text('GST (18%)', 400, yPosition + 40)
            .text(`₹${tax.toFixed(2)}`, 500, yPosition + 40);

        // Total with Prominent Styling
        doc.font('Helvetica-Bold')
            .fontSize(14)
            .fillColor(colors.highlight)
            .text('TOTAL', 400, yPosition + 60)
            .text(`₹${(subtotal + tax).toFixed(2)}`, 500, yPosition + 60);

        // Creative Footer
        doc.font('Helvetica')
            .fontSize(8)
            .fillColor(colors.secondary)
            .text('Thank you for choosing Artistaa - Where Creativity Meets Quality', 50, 750, { align: 'center' })
            .text('This is a computer-generated invoice', 50, 760, { align: 'center' });

        // Decorative border
        doc.lineWidth(0.5)
            .strokeColor(colors.border)
            .rect(40, 40, 520, 770)
            .stroke();

        // Finalize the PDF
        doc.end();
    } catch (error) {
        console.error("Error generating invoice:", error);
        res.status(500).send("Error generating invoice.");
    }
};

module.exports = {
    createOrder,
    getOrderDetails,
    cancelOrder,
    applyCoupon,
    orderSuccess,
    getInvoice
    
}
const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Order = require("../../models/orderSchema");
const Address = require("../../models/addressSchema");
const Coupon = require("../../models/couponSchema");
const { loadShopping } = require("./userController");
const Wallet = require("../../models/walletSchema");
const Return = require("../../models/returnSchema");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const { Transaction } = require("mongodb");
const { trusted } = require("mongoose");

const createOrder = async (req, res) => {
  try {
    console.log("entered create order")
    const user = await User.findById({ _id: req.session.user });
    const data = req.body.formData ? req.body.formData : req.body;
    console.log("create order data:", data);
    const {
      singleProduct,
      cart,
      totalPrice,
      discount,
      finalAmount,
      address,
      couponCode,
      payment_option,
      cartData,
      singleProductId,
      singleProductQuantity,
    } = data;

    const addresses = await Address.findOne({ userId: req.session.user });

    if (!addresses || !addresses.address || addresses.address.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No saved addresses found" });
    }

    const selectedAddress = addresses.address.find(
      (addr) => addr._id.toString() === address.toString()
    );
    if (!selectedAddress) {
      return res
        .status(404)
        .json({ success: false, message: "Selected address not found" });
    }

    const shippingAddress = {
      addressType: selectedAddress.addressType,
      name: selectedAddress.name,
      city: selectedAddress.city,
      landMark: selectedAddress.landMark,
      state: selectedAddress.state,
      pincode: selectedAddress.pincode,
      phone: selectedAddress.phone,
      altPhone: selectedAddress.altPhone,
    };
    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode });
      if (coupon) {
        if (coupon.userId.includes(user._id)) {
          return res
            .status(400)
            .json({
              success: "false",
              message: "You have already used this coupon.",
            });
        }
        await Coupon.findOneAndUpdate(
          { code: couponCode },
          { $push: { userId: user._id } }
        );
      }
      console.log("coupon applied");
    }
    let orderedItems = [];
    console.log("singleProduct:",singleProduct,"singleQuantity:",singleProductQuantity,"singleProductId:",singleProductId)
    const product = singleProduct ? JSON.parse(singleProduct) : null;
    if (product && product._id) {
      orderedItems.push({
        product: product._id,
        quantity: singleProductQuantity,
        price: product.salePrice,
      });
    } else if (cart) {
      const cartItems = JSON.parse(cart);
      orderedItems = cartItems.map((item) => ({
        product: item.productId,
        quantity: item.quantity,
        price: item.totalPrice,
      }));
    }
    let payment_status;
    if (payment_option == "COD") {
      payment_status = "COD";
    } else {
      payment_status = "pending";
    }

    const newOrder = new Order({
      userId: user._id,
      orderedItems,
      totalPrice,
      discount,
      finalAmount,
      shippingAddress: shippingAddress,
      paymentMethod: payment_option,
      payment_status: payment_status,
      couponCode,
      couponApplied: couponCode ? true : false,
      status: "Pending",
      createdOn: Date.now(),
      invoiceDate: new Date(),
    });
    if (!newOrder) {
      console.log("order not placed");
    }

    await newOrder.save();
    user.orderHistory.push(newOrder._id);
    await user.save();
    payment_option == "online"? res.status(200).json({ success: "true", orderId: newOrder._id })
    : res.render("orderSuccess", { orderId: newOrder._id });

    // return res.render("orderSuccess", { orderId: newOrder._id });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).send("Internal Server Error");
  }
};

const getOrderDetails = async (req, res) => {
  try {
    const orderId = req.query.id;
    const orderDetails = await Order.findOne({ orderId: orderId })
      .populate("orderedItems.product")
      .lean();

    if (!orderDetails) {
      return res.status(404).render("pageNotFound");
    }

    const address = orderDetails.shippingAddress;

    res.render("viewOrder", {
      order: orderDetails,
      address: address || {},
    });
  } catch (error) {
    console.error("Error retrieving order details:", error);
    res.status(500).redirect("/pageNotFound");
  }
};

const cancelOrder = async (req, res) => {
  try {
    const userId = req.session.user;
    const orderId = req.query.id;
    const order = await Order.findOneAndUpdate(
      { _id: orderId, status: { $ne: "Cancelled" } },
      { $set: { status: "Cancelled" } },
      { new: true }
    );

    if (!order) {
      return res.json({
        success: false,
        message: "Order not found or already cancelled",
      });
    }
    if (order.payment_status !== "pending" && order.paymentMethod != "COD") {
      const walletUpdate = await Wallet.findOneAndUpdate(
        { userId: userId },
        {
          $inc: { balance: order.finalAmount },
          $push: {
            transactions: {
              type: "Refund",
              amount: order.finalAmount,
              orderId: order._id,
            },
          },
        },
        { upsert: true, new: true }
      );

      if (walletUpdate) {
        return res.json({
          success: true,
          message: "Order cancelled and refunded successfully",
          orderId,
        });
      } else {
        return res.json({
          success: true,
          message: "Order cancelled but refund failed",
          orderId,
        });
      }
    }
    return res.json({
      success: true,
      message: "Order cancelled successfully",
      orderId,
    });
  } catch (error) {
    console.error("cancelOrder error", error);
    return res
      .status(500)
      .json({ success: false, message: "An error occurred" });
  }
};

const applyCoupon = async (req, res) => {
  try {
    console.log(req.body);
    const { couponCode, totalPrice } = req.body;
    const total = Number(totalPrice);
    console.log(total);
    const coupon = await Coupon.findOne({ code: couponCode });

    if (!coupon) {
      return res
        .status(400)
        .json({ success: false, message: "Coupon not Found" });
    }
    if (coupon.userId.includes(req.session.user)) {
      return res
        .status(400)
        .json({ success: false, message: "coupon is  already used" });
    }
    if (new Date() > coupon.expireOn) {
      return res
        .status(400)
        .json({ success: false, message: "coupon is expired" });
    }
    if (totalPrice < coupon.minimumPrice) {
      return res
        .status(400)
        .json({
          success: false,
          message: `Minimum spend of ${coupon.minimumPrice} required to apply this coupon.`,
        });
    }
    const discountAmount = (total * coupon.offerPercentage) / 100;
    const newTotal = total - discountAmount;

    console.log("dis", discountAmount, "total", newTotal);
    return res.status(200).json({
      success: true,
      discountAmount: discountAmount,
      newTotal: newTotal,
    });
  } catch (error) {
    console.log("coupon apply error", error);
  }
};

const orderSuccess = async (req, res) => {
  const { orderId } = req.query;
  res.render("orderSuccess", { orderId });
};

const getInvoice = async (req, res) => {
  const orderId = req.query.id;

  const formatCurrency = (amount) => {
    return `Rs:${amount.toFixed(2)}`;
  };

  try {
    const order = await Order.findById(orderId)
      .populate("userId", "name email")
      .populate("orderedItems.product", "productName salePrice");

    if (!order) {
      return res.status(404).send("Order not found.");
    }

    const doc = new PDFDocument({
      margin: 50,
      size: "A4",
      font: "Helvetica",
    });

    const fileName = `invoice-${orderId}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    doc.pipe(res);

    // Define colors
    const colors = {
      primary: "#2C3639",
      secondary: "#3F4E4F",
      accent: "#A27B5C",
      highlight: "#DCD7C9",
      text: "#2C3639",
      background: "white",
      border: "#A27B5C",
    };
    const path = require("path");
    const logoPath = path.join(
      __dirname,
      "..",
      "..",
      "public",
      "uploads",
      "banner",
      "logoSVG.png"
    );
    doc
      .image(logoPath, 70, 70, { width: 60 }) 
      .circle(100, 100, 35)
      .strokeColor(colors.border)
      .lineWidth(0.5)
      .stroke();

    doc
      .font("Helvetica-Bold")
      .fontSize(24)
      .fillColor(colors.primary)
      .text("ARTISTAA", 150, 85)
      .fontSize(12)
      .text("Curating Creativity | Delivering Excellence", 150, 110);

    // Tax Invoice Title
    doc
      .fontSize(20)
      .fillColor(colors.primary)
      .text("TAX INVOICE", 0, 220, { align: "center" });

    // Billing Details
    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .text("BILLED TO:", 50, 250)
      .font("Helvetica")
      .text(order.userId.name, 50, 270)
      .text(order.userId.email, 50, 285)
      .text(`Shipping Address: ${order.shippingAddress.name}`, 50, 300)
      .text(`${order.shippingAddress.addressType}`, 50, 315)
      .text(
        `${order.shippingAddress.city}, ${order.shippingAddress.state} - ${order.shippingAddress.pincode}`,
        50,
        330
      );

    // Order Summary Table
    const tableTop = 350;
    doc
      .font("Helvetica-Bold")
      .fillColor(colors.primary)
      .text("DESCRIPTION", 60, tableTop + 10)
      .text("QTY", 310, tableTop + 10)
      .text("PRICE", 400, tableTop + 10)
      .text("AMOUNT", 490, tableTop + 10);

    let yPosition = tableTop + 40;
    let subtotal = 0;

    order.orderedItems.forEach((item) => {
      const itemTotal = item.product.salePrice * item.quantity;
      subtotal += itemTotal;

      doc
        .font("Helvetica")
        .fontSize(10)
        .text(item.product.productName, 60, yPosition)
        .text(item.quantity.toString(), 310, yPosition)
        .text(formatCurrency(item.product.salePrice), 400, yPosition)
        .text(formatCurrency(itemTotal), 490, yPosition);
      yPosition += 25;
    });

    // Discount and Final Total
    const total = subtotal - order.discount;

    doc
      .text("Subtotal", 360, yPosition + 20)
      .text(formatCurrency(subtotal), 490, yPosition + 20, { align: "right" })
      .text("Discount", 360, yPosition + 40)
      .text(formatCurrency(order.discount), 490, yPosition + 40, { align: "right" })
      .font("Helvetica-Bold")
      .text("TOTAL", 360, yPosition + 75)
      .text(formatCurrency(total), 490, yPosition + 75, { align: "right" });

    doc.end();
  } catch (error) {
    console.error("Error generating invoice:", error);
    res.status(500).send("Error generating invoice.");
  }
};


const returnSubmit = async (req, res) => {
  try {
    const userId = req.session.user;
    const { orderId, reason } = req.body;
    const returnData = new Return({
      userId: userId,
      orderId: orderId,
      reason: reason,
      status: "Pending",
    });
    const data = await returnData.save();
    const orderUpdate = await Order.findByIdAndUpdate(
      { _id: orderId },
      { $set: { status: "Return Request" } }
    );

    if (data && orderUpdate) {
      return res.status(200).json({ success: true });
    }
    return res.status(400).json({ success: false });
  } catch (error) {
    console.log("error in return submit", error);
    res.status(500).send("Error in returing");
  }
};

module.exports = {
  createOrder,
  getOrderDetails,
  cancelOrder,
  applyCoupon,
  orderSuccess,
  getInvoice,
  returnSubmit,
};

const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Cart = require("../../models/cartSchema");
const Address = require("../../models/addressSchema");
const Order = require("../../models/orderSchema");



const showCart = async (req, res) => {
    try {
        const userId = req.session.user;
        const user = await User.findById(userId)
        if(!userId){
            return res.status(404).redirect("/login");
        }
        const cart = await Cart.findOne({ userId }).populate("items.productId") || [];
        const activeItems = cart.items.filter(item => item.productId && !item.productId.isBlocked && item.productId.quantity >= item.quantity);
        cart.items=activeItems;
        if (!cart) {
            return res.status(404).render("cart", { user: user, cartTotal: 0 });
        }
        
        const cartTotal = Array.isArray(cart.items) ? cart.items.reduce((acc, item) => acc + item.totalPrice, 0) : 0;

        res.render("cart", { cart: cart, cartTotal: cartTotal, user: user });
            
        

        
    } catch (error) {
        console.error("Error showing cart:", error);
        res.status(500).send("Error showing cart");
    }
};

const addToCart = async (req, res) => {
    try {
        const userId = req.session.user;
        if (!userId) {
            return res.status(404).redirect("/login");
        }

        const { productId, quantity } = req.query;
        const quantityNumber = parseInt(quantity, 10); 

        const product = await Product.findById({ _id: productId });
        console.log(product);
        
        const productPrice = product.salePrice;
        const itemTotalPrice = productPrice * quantityNumber;
        
        let cart = await Cart.findOne({ userId: userId });

        if (!cart) {
            cart = new Cart({
                userId,
                items: [{
                    productId,
                    quantity: quantityNumber,
                    price: productPrice,
                    totalPrice: itemTotalPrice
                }]
            });
        } else {
            const itemIndex = cart.items.findIndex(item => item.productId.equals(productId));

            if (itemIndex > -1) {
                cart.items[itemIndex].quantity += quantityNumber;
                cart.items[itemIndex].totalPrice = cart.items[itemIndex].quantity * productPrice;
            } else {
                cart.items.push({
                    productId,
                    quantity: quantityNumber,
                    price: productPrice,
                    totalPrice: itemTotalPrice
                });
            }
        }
        
        await cart.save();
        return res.status(200).redirect("/cart");
    } catch (error) {
        console.error("Error adding to cart:", error);
        res.status(500).send("Error adding to cart");
    }
};


const removeCart = async (req, res) => {
    try {
        const userId = req.session.user;
        const { productId } = req.query;

        if (!userId) {
            return res.status(404).redirect("/login");
        }
        const cart = await Cart.findOne({ userId });

        if (cart) {
            cart.items = cart.items.filter(item => !item.productId.equals(productId));
            await cart.save();
        }
        res.redirect("/cart");
    } catch (error) {
        console.error("Error removing from cart:", error);
        res.status(500).send("Error removing from cart");
    }
};
const getCheckOut = async (req, res) => {
    try {
        const userId = req.session.user;
        
        if (!userId) {
            return res.status(404).redirect("/login");
        }
        
        const user = await User.findById(userId);
        const productId = req.query.productId;
        const qty = parseInt(req.query.qty);
    
        const addresses = (await Address.findOne({ userId })) || [];

        let totalPrice;

        if (productId) {
           
            const product = await Product.findById(productId);
            if (!product || product.isBlocked) {
                return res.status(404).redirect("/pageNotFound");
            }
           
             totalPrice = product.salePrice*qty
            return res.render('checkout', { cart: null, product, addresses: addresses.address, totalPrice, user, qty });
        } else {
          
            const cartItems = await Cart.findOne({ userId }).populate('items.productId');
            if (!cartItems || cartItems.items.length === 0) {
                return res.render('checkout', { cart: null, addresses: addresses.address, totalPrice: 0, product: null, user });
            }
            
            const activeItems = cartItems.items.filter(item => item.productId && !item.productId.isBlocked && item.productId.quantity >= item.quantity);
            if (activeItems.length === 0) {
                return res.render('checkout', { cart: null,  addresses: addresses.address, totalPrice: 0, product: null, user });
            }
            console.log("acct",activeItems)

            totalPrice = activeItems.reduce((sum, item) => sum + item.totalPrice, 0);
            return res.render('checkout', { cart: cartItems, addresses: addresses.address, totalPrice, product: null, user });
        }
    } catch (error) {
        console.error(error);
        res.status(500).send("Error retrieving checkout information");
    }
};




const updateQty = async (req, res) => {
    const { productId, change } = req.body;
    try {

        const userId = req.session.user;
        if (!userId) {
            return res.json({ success: false, message: "User not logged in" });
        }

        const cart = await Cart.findOne({ userId: userId });
        if (!cart) {
            return res.json({ success: false, message: "Cart not found" });
        }

        const item = cart.items.find((item) => item.productId.toString() === productId);
        if (item) {
            item.quantity += change;
            item.totalPrice = item.quantity * item.price;

            if (item.quantity <= 0) {
                cart.items = cart.items.filter((item) => item.productId.toString() !== productId);
            }

            cart.totalPrice = cart.items.reduce((total, item) => total + item.totalPrice, 0);
            await cart.save();

            res.json({
                success: true,
                newQuantity: item.quantity,
                newSubtotal: item.totalPrice,
                totalPrice: cart.totalPrice,
            });
        } else {
            res.json({ success: false, message: "Item not found in cart" });
        }

    } catch (error) {
        console.error(error);
        res.json({ success: false, message: "Failed to update quantity" });
    }

};






module.exports={
    showCart,
    addToCart,
    removeCart,
    getCheckOut,
    updateQty,
    
}
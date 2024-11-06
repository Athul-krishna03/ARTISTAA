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

        if (!cart) {
            return res.status(404).render("cart");
        }
        const cartTotal = cart.items.reduce((acc, item) => acc + item.totalPrice, 0);

        res.render("cart", { cart:cart, cartTotal:cartTotal,user:user });
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
        const user = await User.findById(userId);
        const productId = req.query.productId;
        const addresses = await Address.findOne({ userId:userId}) || [];
        if (!userId) {
            return res.status(404).redirect("/login");
        }

        let totalPrice;

        if (productId) {
            const product = await Product.findById(productId);
            if (!product) {
                return res.status(404).send("/pageNotFound");
            }
            totalPrice = product.salePrice
            return res.render('checkout', { cart: null, product, addresses: addresses.address , totalPrice , user:user });
        } else {
            const cartItems = await Cart.findOne({ userId: user }).populate('items.productId');
            if (!cartItems) {
                return res.render('checkout', { cart: null, products: [], address: addresses.address, totalPrice, product: null });
            }
            totalPrice = cartItems.items.reduce((sum, item) => sum + item.totalPrice, 0);
            return res.render('checkout', { cart: cartItems, products: cartItems.items, addresses: addresses.address, totalPrice, product: null , user:user});
        }
    } catch (error) {
        console.error(error);
        res.status(500).send("Error retrieving checkout information");
    }
};


const updateQty = async (req, res) => {
    try {
        console.log("entered")
        const { productId, quantity } = req.body;
        const userId = req.session.user._id; // Assuming you store user ID in session

        // Find the cart for this user
        const userCart = await Cart.findOne({ userId: userId });
        
        if (!userCart) {
            return res.status(404).json({
                success: false,
                message: 'Cart not found'
            });
        }

        // Find the item in the cart
        const cartItem = userCart.items.find(item => 
            item.productId.toString() === productId
        );

        if (!cartItem) {
            return res.status(404).json({
                success: false,
                message: 'Product not found in cart'
            });
        }

        // Get product details to check stock and calculate new price
        const product = await Product.findById(productId);
        
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Validate stock
        if (quantity > product.quantity) {
            return res.status(400).json({
                success: false,
                message: 'Requested quantity exceeds available stock'
            });
        }

        // Update quantity and total price
        cartItem.quantity = quantity;
        cartItem.totalPrice = quantity * product.salePrice;

        // Recalculate cart total
        userCart.total = userCart.items.reduce((total, item) => total + item.totalPrice, 0);

        // Save the updated cart
        await userCart.save();

        res.json({
            success: true,
            message: 'Cart updated successfully',
            newTotal: userCart.total
        });

    } catch (error) {
        console.error('Error updating cart:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};




module.exports={
    showCart,
    addToCart,
    removeCart,
    getCheckOut,
    updateQty
}
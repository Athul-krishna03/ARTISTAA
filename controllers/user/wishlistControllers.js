const Wishlist = require("../../models/wishlistSchema");
const Coupon = require("../../models/couponSchema")



const checkWishlist=async (req, res) => {
    try {
        const productId = req.query.productId;
        const user = req.session.user;
        const isInWishlist = await Wishlist.exists({ userId: user._id, productId: productId });
        res.json({ isInWishlist });
    } catch (err) {
        console.error('Error checking wishlist:', err);
        res.status(500).json({ success: false, message: 'Error checking wishlist status' });
    }
}

const getWishlist = async (req,res) => {
    try {
        const userId = req.session.user;
        if(!userId){
            return res.status(404).redirect("/login");
        }
        const wishlist = await Wishlist.findOne({userId:userId}).populate("products.productId") || [];
        console.log(wishlist)
        if(wishlist){
            return res.render("wishlist",{wishlistItems:wishlist})
        }else{
            return res.redirect("/login")
        }
        
    } catch (error) {
        console.log("get whishlist error",error);
        return res.status(404).redirect("/pageNotFound")
    }
}

const addWishlist = async (req, res) => {
    try {
        const userId = req.session.user;
        const productId = req.query.productId;
        let wishlist = await Wishlist.findOne({ userId: userId });

        if (wishlist) {
            const productExists = wishlist.products.some(item => item.productId.toString() === productId);
            if (!productExists) {
                wishlist.products.push({ productId });
                await wishlist.save();
            }
            return res.status(200).redirect("/wishlist");
        } else {
            
            const newWishlist = new Wishlist({
                userId,
                products: [{ productId }],
            });
            await newWishlist.save();
            return res.status(200).redirect("/wishlist");
        }
    } catch (error) {
        console.error("Error in adding to wishlist:", error);
        return res.status(500).json({ message: "Failed to add product to wishlist" });
    }
};

const removeFromWishlist = async (req, res) => {
    try {
        const userId = req.session.user;
        if (!userId) {
            return res.status(401).json({ message: "Please log in to access your wishlist." });
        }
        const { productId } = req.body;
        const result = await Wishlist.updateOne({ userId },{ $pull: { products: { productId } } }
        );

        if (result.modifiedCount === 0) {
            return res.status(404).json({ message: "Item not found in wishlist." });
        }

        return res.status(200).json({ message: "Item removed from wishlist successfully." });
    } catch (error) {
        console.error("Error removing item from wishlist:", error);
        res.status(500).json({ message: "An error occurred while removing the item from the wishlist." });
    }
};

const getcouponList = async (req,res) => {
    try {
        const userId = req.session.user
        const coupon = await Coupon.find();
        const coupons = coupon.filter(coupon => !coupon.userId.includes(userId));

        if(coupon){
            return res.render("couponListing",{coupons:coupons})
        }
        console.log(coupons)
    } catch (error) {
        console.log("coupon get error",error);
        return res.redirect("/pageNotFound");
    }
}

module.exports={
    getWishlist,
    addWishlist,
    removeFromWishlist,
    checkWishlist,
    getcouponList
}
const Coupon = require("../../models/couponSchema");

const getCouponPage = async (req,res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit =6;
        const skip =(page-1)*limit;

        const coupons = await Coupon.find({})
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

        const totalCategories = await Coupon.countDocuments();
        const totalPages = Math.ceil(totalCategories/limit);
        res.render("coupon",{
            coupons:coupons,
            totalCategories:totalCategories,
            totalPages:totalPages,
            currentPage:page,
            activePage: 'coupon'
        })
    } catch (error) {
        console.log("get coupon error ",error);
        
    }
}

const addCoupon = async (req, res) => {
    try {
        console.log(req.body);
        let { code, createdOn, expireOn, offerPercentage, minimumPrice } = req.body;
        let percentage = Number(offerPercentage);
        let miniPrice = Number(minimumPrice);

        const existingCoupon = await Coupon.findOne({ code });
        if (existingCoupon) {
            return res.status(400).json({ success: false, message: "Coupon code already exists" });
        }

        const startDate = new Date(createdOn);
        const endDate = new Date(expireOn);
        if (endDate <= startDate) {
            return res.status(400).json({ success: false, message: "Expiration date must be after start date" });
        }
        const newCoupon = new Coupon({
            code,
            createdOn: startDate,
            expireOn: endDate,
            offerPercentage: percentage,
            minimumPrice: miniPrice,
            isList: true
        });

        await newCoupon.save();
        
        res.status(200).json({ success: true, message: "Coupon added successfully" });
    } catch (error) {
        console.error('Error adding coupon:', error);
        res.status(500).json({ success: false, message: "Error adding coupon" });
    }
};



module.exports = {
    getCouponPage,
    addCoupon
}
const User = require("../../models/userSchema");
const mongoose= require("mongoose");
const bcrypt=require("bcrypt");
const Order = require("../../models/orderSchema");

const pageerror=async(req,res)=>{
    res.render("admin-error")
}

const loadlogin=async (req,res) => {
    try {
        const message=req.query.message || null;

        if(req.session.admin){
            return res.redirect("/admin")
        }
        return res.render("admin-login",{message:message});
    } catch (error) {
        console.error("adminLogin error",error.message);
        
    }
}
const login =async (req,res) => {
    try {
        const {email,password}=req.body;
        const admin = await User.findOne({email,isAdmin:true})
        if(admin){
            const passMatch=await bcrypt.compare(password,admin.password);
            if(passMatch){
                req.session.admin=true;
                return res.redirect("/admin");

            }else{
                return res.redirect("/admin/login?message=Invaild Ceredentials")
            }
        }else{
            return res.redirect("/admin/login?message=Invaild Ceredentials")
        }
    } catch (error) {
        console.error("login error",error.message)
    }
}
const loadDashboard = async (req, res) => {
    try {

        if (req.session.admin) {
            const salesData = await getTotalSales();
            const products = await getMostSellingProducts();
            const categories = await getMostSellingCategories();
            const brands = await getMostSellingBrands();

            console.log(salesData)
            res.render('dashboard', { salesData, products, categories, brands,activePage: 'dashboard' });
        }

    } catch (error) {
        res.redirect('/pageNotFouond')
    }
}

async function getTotalSales() {
    try {
        const totalSales = await Order.aggregate([
            {
                $group: {
                    _id: null,
                    totalSalesAmount: { $sum: "$finalAmount" }
                }
            }
        ]);
        const today = new Date();
        const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay() + 1)); 
        startOfWeek.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(today.setDate(today.getDate() - today.getDay() + 7));
        endOfWeek.setHours(23, 59, 59, 999);

        const dailySales = await Order.aggregate([
            {
                $match: {
                    createdOn: {
                        $gte: startOfWeek,
                        $lte: endOfWeek
                    }
                }
            },
            {
                $group: {
                    _id: { $dayOfWeek: "$createdOn" }, 
                    sales: { $sum: "$finalAmount" }
                }
            },
            {
                $sort: { "_id": 1 }
            }
        ]);
        const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const weeklyData = {
            labels: daysOfWeek,
            data: Array(7).fill(0)
        };
        console.log(dailySales);
        
        dailySales.forEach(item => {
            weeklyData.data[item._id - 1] = item.sales;
        });

        const monthlySales = await Order.aggregate([
            {
                $match: {
                    createdOn: {
                        $gte: new Date(new Date().getFullYear(), 0, 1)
                    }
                }
            },
            {
                $group: {
                    _id: { $month: "$createdOn" },
                    sales: { $sum: "$finalAmount" }
                }
            },
            {
                $sort: { "_id": 1 }
            }
        ]);

        const yearlySales = await Order.aggregate([
            {
                $group: {
                    _id: { $year: "$createdOn" },
                    sales: { $sum: "$finalAmount" }
                }
            },
            {
                $sort: { "_id": 1 }
            },
            {
                $limit: 5
            }
        ]);

        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        const monthlyData = {
            labels: [],
            data: []
        };

        for (let i = 1; i <= 12; i++) {
            const monthData = monthlySales.find(item => item._id === i);
            monthlyData.labels.push(monthNames[i - 1]);
            monthlyData.data.push(monthData ? monthData.sales : 0);
        }

        const yearlyData = {
            labels: yearlySales.map(item => item._id.toString()),
            data: yearlySales.map(item => item.sales)
        };

        return {
            totalSalesAmount: totalSales.length > 0 ? totalSales[0].totalSalesAmount : 0,
            weekly: weeklyData,
            monthly: monthlyData,
            yearly: yearlyData
        };
    } catch (error) {
        console.error("Error calculating sales data:", error);
        return {
            totalSalesAmount: 0,
            weekly: { labels: [], data: [] },
            monthly: { labels: [], data: [] },
            yearly: { labels: [], data: [] }
        };
    }
}


async function getMostSellingProducts() {
    try {
        const result = await Order.aggregate([
            { $unwind: "$orderedItems" },

            {
                $lookup: {
                    from: "products",
                    localField: "orderedItems.product",
                    foreignField: "_id",
                    as: "productDetails"
                }
            },

            { $unwind: "$productDetails" },

            {
                $group: {
                    _id: "$orderedItems.product",
                    productName: { $first: "$productDetails.productName" },
                    totalQuantitySold: { $sum: "$orderedItems.quantity" }
                }
            },

            { $sort: { totalQuantitySold: -1 } },

            { $limit: 10 }
        ]);

        result.forEach(item => {
            item._id = item._id.toString();
        });

        return result;
    } catch (error) {
        console.error("Error finding most selling product:", error);
    }
}

async function getMostSellingCategories() {
    try {
        const result = await Order.aggregate([
            { $unwind: "$orderedItems" },

            {
                $lookup: {
                    from: "products",
                    localField: "orderedItems.product",
                    foreignField: "_id",
                    as: "productDetails"
                }
            },

            { $unwind: "$productDetails" },

            {
                $lookup: {
                    from: "categories",
                    localField: "productDetails.category",
                    foreignField: "_id",
                    as: "categoryDetails"
                }
            },

            { $unwind: "$categoryDetails" },

            {
                $group: {
                    _id: "$productDetails.category",
                    categoryName: { $first: "$categoryDetails.name" },
                    totalQuantitySold: { $sum: "$orderedItems.quantity" }
                }
            },

            { $sort: { totalQuantitySold: -1 } },

            { $limit: 10 }
        ]);

        result.forEach(item => {
            item._id = item._id.toString();
        });

        return result;
    } catch (error) {
        console.error("Error finding most selling category:", error);
    }
}

async function getMostSellingBrands() {
    try {
        const result = await Order.aggregate([
            { $unwind: "$orderedItems" },

            {
                $lookup: {
                    from: "products",
                    localField: "orderedItems.product",
                    foreignField: "_id",
                    as: "productDetails"
                }
            },

            { $unwind: "$productDetails" },

            {
                $group: {
                    _id: "$productDetails.brand",
                    totalQuantitySold: { $sum: "$orderedItems.quantity" }
                }
            },

            { $sort: { totalQuantitySold: -1 } },

            { $limit: 10 },
        ]);

        result.forEach(item => {
            item._id = item._id.toString();
        });

        return result;
    } catch (error) {
        console.error("Error finding most selling category and brand:", error);
    }
}


const logout=async (req,res) => {
    try {
        req.session.admin=null;
        return res.redirect("/admin/login")
        
        
    } catch (error) {
        console.error("logout error",error.message)
    }
}




module.exports={
    loadlogin,
    login,
    loadDashboard,
    logout,
    pageerror
}
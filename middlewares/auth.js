const User =require("../models/userSchema");

const userAuth = async (req, res, next) => {
    try {
      if (req.session.user) {
        const user = await User.findOne({_id:req.session.user},{ isAdmin: false });
  
        if (user && !user.isBlocked) {
          return next();
        } else {
          return res.redirect("/login");
        }
      } else {
        return res.redirect("/login");
      }
    } catch (error) {
      console.error("Error in user authentication:", error);
      return res.status(500).send("Internal server error");
    }
  };
  
const adminAuth = async (req, res, next) => {
    
        try {
            
            if (!req.session.admin) {
                return res.redirect("/admin/login");
            }
    
            const admin = await User.findOne({  isAdmin: true });
    
            if (admin) {
                next();
            } else {
                return res.redirect("/admin/login");
            }
        } catch (error) {
            console.error("Error in adminAuth middleware:", error);
            res.status(500).send("Internal server error");
        }
    
   
};


module.exports={
    userAuth,
    adminAuth
}
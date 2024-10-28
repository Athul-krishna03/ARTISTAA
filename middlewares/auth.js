const User =require("../models/userSchema");

const userAuth=(req,res,next)=>{
     if(req.session.user){
        User.findById(req.session.user)
        .then(data=>{
            if(data && !data.isBlocked){
                next();
            }else{
                return res.redirect("/login");
            }
        })
        .catch(error=>{
            console.log("Error in user auth",error);
            res.status(500).send("Internal server error")
        })
     }else{
       return  res.render("login");
     }
}



const adminAuth=(req,res,next)=>{
    console.log(req.session.user)
    if(req.session.user){
        User.findOne({_id:req.session.user._id,isAdmin:true})
        .then(data=>{
            console.log(data)
            if(data){
               next();
            }else{
                return res.redirect("/admin/login")
            }       
        })
        .catch(error=>{
            console.log("Error in adminAuth middleware",error);
            res.status(500).send("Internal server error");
        })
    }else{
        return res.redirect("/admin/login")
    }
    
}

module.exports={
    userAuth,
    adminAuth
}
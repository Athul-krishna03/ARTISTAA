const express=require("express");
const path=require("path")
const app=express();
const db=require("./config/db");
const session=require("express-session");
const userRouter=require("./routes/userRouter");
const adminRouter=require("./routes/adminRouter")
const passport= require("./config/passport");
const redis = require('./helpers/redisClient');
const logger = require('./helpers/logger');
const requestLogger = require('./middlewares/requestLogger');


db()
require("dotenv").config();


app.use(express.json());
app.use(express.urlencoded({extended:true}))
app.use(session({
    secret:process.env.SESSION_SECRET,
    resave:false,
    saveUninitialized:true,
    cookie:{
        secure:false,
        httpOnly:true,
        maxAge:72*60*60*1000
    }
}))

app.use(passport.initialize());
app.use(passport.session());
app.use(requestLogger);


app.use((req,res,next)=>{
    res.set("cache-control","no-store");
    next();

});

app.set("view engine","ejs")
app.set("views",[path.join(__dirname,"views/user"),path.join(__dirname,"views/admin")]);
app.use(express.static("public"));

app.use("/",userRouter);
app.use("/admin",adminRouter);

app.use((req,res)=>{
    res.redirect("/pageNotFound")
})

app.listen(process.env.PORT,()=>{
    console.log("server Running");
    logger.info(`Server started on port ${process.env.PORT}`);
})



module.exports=app
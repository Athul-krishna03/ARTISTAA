const mongoose=require("mongoose");
require("dotenv").config();

const connectDB=async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("db connect");
        
    } catch (error) {
        console.log(error.message,"db errorr")
        process.exit(1);
    }
}

module.exports=connectDB
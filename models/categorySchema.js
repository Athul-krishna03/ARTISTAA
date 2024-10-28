const mongoose=require("mongoose");
const {Schema}=mongoose;

const categorySchema= new Schema({
    name:{
        type:String,
        required:true,
        
    },
    description:{
        type:String,
        required:true
    },
    isListed:{
        type:Boolean,
        default:true
    },
    categoryOffer:{
        type:Schema.Types.ObjectId,
        ref:"Category",
        
    },createdAt:{
        type:Date,
        default:Date.now
        
    }
})

module.exports=mongoose.model("Category",categorySchema);


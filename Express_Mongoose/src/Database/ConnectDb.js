import mongoose from "mongoose"

const connectDB=async()=>{
   try{
        const connection=await mongoose.connect(`${process.env.MONGODB_URL}` || 'mongodb://127.0.0.1:27017/myapp')
        console.log("connected to the mongodb server");
   }catch(Err){
        console.log("failed to connect to the mongodb server",Err)
        process.exit(1)
   } 
}


export default connectDB
import app from "./app.js"
import dotenv from "dotenv"
import connectDB from "./src/Database/ConnectDb.js"

dotenv.config()

const PORT=process.env.PORT || 8000

const startServer=async()=>{
    try{
       await connectDB()
        app.listen(PORT,()=>{
            console.log(`server is running on port ${PORT}`)
        }) 
    }catch(Err){
        console.log("failed to satrt server on",PORT)
        process.exit(1)
    }
}
startServer()

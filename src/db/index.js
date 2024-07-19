import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const MONGO_DB_URI="mongodb+srv://shivanshu:shiva123@atlascluster.zjqy4vg.mongodb.net"

const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(`${MONGO_DB_URI}/${DB_NAME}`)
        console.log(`\n MongoDB connected !! DB HOST: ${connectionInstance.connection.host}`);
    } catch (error) {
        console.log("MONGODB connection FAILED ", error);
        process.exit(1)
    }
}

export {connectDB}
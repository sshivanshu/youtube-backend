import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";
import express from "express";

const app = express();


export const connectDB= async ()=>{
    try {
        await mongoose.connect(`${process.env.MONGO_DB_URI}/${DB_NAME}`);
        app.on("error", (err) => {
            console.log("Error:",err);
            throw err;
        })
    } catch (error) {
        console.log("Error:",error);
    }

}
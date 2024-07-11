import connectDB  from "./db.js";
import express from "express";
import dotenv from "dotenv";

dotenv.config({
    path: config
})

connectDB()
.then(()=>{
    app.listen(process.env.PORT || 8000 )
})
.catch()


const app = express();



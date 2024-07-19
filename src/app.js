import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { asyncHandler } from './utils/asyncHandler.js';
const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(express.static("public"))
app.use(cookieParser())


//routes

import userRouter from './routes/user.routes.js'


// routes
app.use("/api/v1/users", userRouter);
// app.get("/", asyncHandler( async (req,res)=>{
//     res.status(200).json({
//         "success": true
//     })
// }))

export {app}
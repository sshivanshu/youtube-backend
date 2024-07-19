import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import path from "path"
import { subscribe } from "diagnostics_channel";


const generateAccessRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()
        
        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})

        return {accessToken, refreshToken}

    } catch (error) {
        throw new ApiError(500, "Something went wrong")
    }
}


const registerUser = asyncHandler(
    async (req, res) => {
    const { fullName, email, username, password } = req.body;

    if ([fullName, email, username, password].some(field => field?.trim() === "")) {
        throw new ApiError(400, "All fields are required");
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    });

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists");
    }
    
    console.log("Files received: ", req.files);

    const avatarLocalPath = req.files?.avatar?.[0]?.path ? path.normalize(req.files.avatar[0].path) : null;
    let coverImageLocalPath;

    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = path.normalize(req.files.coverImage[0].path);
    }

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required");
    }

    console.log("Avatar local path: ", avatarLocalPath);

    // Log before calling the function
    console.log("Calling uploadOnCloudinary with avatarLocalPath");

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    console.log("Avatar upload response: ", avatar);

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!avatar) {
        throw new ApiError(400, "Avatar file is required");
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email, 
        password,
        username: username.toLowerCase()
    });

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user");
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully")
    );
}
)

const loginUser = asyncHandler(
   async (req,res) => {
        // re body se data lalo
        // username or email
        // check user present if yes password
        // if password shi h toh access or refresh token bhej do cookie m

        const {email,username,password} = req.body;

        if(!(username || email)) {
            throw new ApiError(403,"username or email required")
        }

        const user = await User.findOne({
            $or : [{username},{email}]
        })

        if(!user){
            throw new ApiError(403,"user not found")
        }

        const isPasswordValid= await user.isPasswordCorrect(password)
        
        if(!isPasswordValid){
            throw new ApiError(403,"Password is not correct")
        }

        const {accessToken,refreshToken} = await generateAccessRefreshToken(user._id)


        const loggedInUser = await User.findById(user._id)
        .select("-password -refresh-token");


        const option = {
            httpOnly: true,
            secure: true
        }

        return res.status(200)
        .cookie("accessToken", accessToken, option)
        .cookie("refreshToken", refreshToken, option)
        .json(
            new ApiResponse(
                200, 
                {
                    user: loggedInUser,accessToken,refreshToken
                },
                "User logged in successfully"
            )
        )


    }
)

const logoutUser = asyncHandler (
   async (req,res) => {
       await User.findByIdAndUpdate(
            req.user._id,
            { 
                $unset: {
                refreshToken: 1
            }   
            },
            {
                new: true
            }
       )


       const option = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken",option)
    .clearCookie("refreshToken",option)
    .json(new ApiResponse(200, {} , "User logged out"))

    }
)

const refreshAccessToken = asyncHandler (
    async (req, res) => {
        const incomingRefreshToken = req.cookie.refreshToken || req.body.refreshToken

        if(!incomingRefreshToken){
            throw new ApiError(500, "unautherized request")
        }

        try {
            const decode = jwt.verify(
                incomingRefreshToken,
                process.env.REFRESH_TOKEN_SECRET
            )
    const user = await User.findById(decode?._id)
    
    if(!user) {
        throw new ApiError(401, "Invalid refresh token")
    }
    
    if(incomingRefreshToken != user?.refreshToken){
        throw new ApiError(401, "refresh token expired")
    }
    
    const option = {
        httpOnly:true,
        secure:true
    }
    
    const {accessToken, newrefreshToken} = await generateAccessRefreshToken(user._id)
    
    return res
    .status(200)
    .cookie("accessToken", accessToken, option)
    .cookie("refreshToken", newrefreshToken, option)
    .json(new ApiResponse(200, {accessToken,newrefreshToken}),"access token refresh sucessfully")
        } catch (error) {
            throw new ApiError(401,error?.message || "Invalid refresh token")
        }

}

)

const changeCurrentPassword = asyncHandler(
   async (req,res) => {
        //body se old password lo
        //verify it if correct new password lo
        // User schema m  new password save

        const {oldPassword, newPassword} = req.body

        const id = req.user?._id

        const user = await User.findById(id)

        const isPasswordCorrect = user.isPasswordCorrect(oldPassword)

        if(!isPasswordCorrect){
            throw new ApiError(400, "Wrong Password entered")
        }

        user.password=newPassword;

        await user.save({validateBeforeSave:false})


       return res.status(200)
       .json(new ApiResponse(200, {} , "Password Changed Sucssesfully"))


    }
)

const getCurrentUser = asyncHandler (
    (req,res) => {
        return res.status(200)
        .json(new ApiResponse(200,req.user,"current user fetched"))
    }
)

const updateAccountDetails = asyncHandler(
    async (req,res) => {
        const {fullName,email} = req.body;

        if(!fullName || !email){
            throw new ApiError(400, "All field required")
        }

        const user = await User.findByIdAndUpdate(req.user?._id , 
            {
                $set: {
                    fullName:fullName,
                    email:email
                }
            },
            {new: true}
        ).select("-password")

        return res
        .status(200)
        .json(new ApiResponse(200, user, "AccountDetails updated successfully"))
    }
)

const updateUserAvatar = asyncHandler(
    async (req,res)=> {
        const avatarLocalPath = req.file?.path
        
        if(!avatarLocalPath){
            throw new ApiError(400,"Avatar file required")
        }

        const avatar = uploadOnCloudinary(avatarLocalPath)

        if(!avatar.url){
            throw new ApiError(400,"Error while uploading on avatar")
        }

        const user = await  User.findOneAndUpdate(req.user?._id,{
            $set: {
                avatar:avatar.url
            }
        },
        {new:true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200,user,"avatar updated"))
    }
)

const updateUserCoverImage = asyncHandler(
    async (req,res)=> {
        const coverImgLocalPath = req.file?.path
        
        if(!avatarLocalPath){
            throw new ApiError(400,"Avatar file required")
        }

        const coverImg = uploadOnCloudinary(coverImgLocalPath)

        if(!coverImg.url){
            throw new ApiError(400,"Error while uploading on coverImage")
        }

        const user = await User.findOneAndUpdate(req.user?._id,{
            $set: {
                coverImage:coverImg.url
            }
        },
        {new:true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200,user,"coverImage updated"))
    }
)

const getUserChannelProfile = asyncHandler(
    async (req,res)=> {
         const {username} = req.params

         if(!username?.trim()){
            throw new ApiError(400,"username is missing")
         }

         const channel = await User.aggregate(
            [
                {
                    $match : {
                        username: username?.toLowerCase()
                    }
                },
                {
                    $lookup: {
                        from: "subscriptions",
                        localField: "$_id",
                        foreignField:"channel",
                        as:"subscribers"
                    }
                },
                {
                    $lookup: {
                        from: "subscriptions",
                        localField: "$_id",
                        foreignField:"subscriber",
                        as:"subscribedTo"
                    }
                },
                {
                    $addFields: {
                        subscriberCount: {
                            $size: "$subscribers"
                        },
                        channelIsSubscribedToCount: {
                            $size: "$subscribedTo"
                        },
                        isSubscribed: {
                            $cond: {
                                if : {$in: [req.user?._id, "$subscribers.subscriber"]}
                            }
                        }
                    }
                },
                {
                    $project : {
                        fullName: 1,
                        username: 1,
                        email: 1,
                        avatar: 1,
                        subscriberCount:1,
                        channelIsSubscribedToCount:1,
                        isSubscribed:1,
                        coverImage:1
                    }
                }
            ]
         )
         if (!channel?.length) {
            throw new ApiError(404, "channel does not exists")
        }
    
        return res
        .status(200)
        .json(
            new ApiResponse(200, channel[0], "User channel fetched successfully")
        )
    }
)

const getWatchHistory = asyncHandler(async(req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            owner:{
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user[0].watchHistory,
            "Watch history fetched successfully"
        )
    )
})



export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken, 
    changeCurrentPassword, 
    updateUserAvatar,
    getCurrentUser,
    updateAccountDetails,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
}
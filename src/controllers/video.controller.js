import mongoose, { isValidObjectId } from "mongoose";
import {Video} from "../models/video.model"
import { ApiError } from "../utils/ApiError";
import { deleteFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary";
import { ApiResponse } from "../utils/ApiResponse";



const getAllVideos = asyncHandler(
    async (req, res) => {
    const { page = 1, limit = 10, query="", sortBy, sortType, userId } = req.query
    //TODO: get all videos based on query, sort, pagination
    let videoAggregate;
    try {
        const pipeline = []
        if(query && query.trim()!==""){
            pipeline.push(
                {
                    $match: {
                        $or: [
                            {title: {regex: query, $option: "i"}},
                            {description: {regex: query, $option: "i"}}
                        ] 
                    }
                }
            )
        }
    
        pipeline.push(
            {
                $lookup: {
                    from:"users",
                    localField:"owner",
                    foreignField: "_id",
                    as: "owner",
                    pipeline: [
                        {
                            $project: {
                                _id:1,
                                username:1,
                                avatar: avatar.url,
                                fullName:1
                            }
                        }
                    ]
                }
            }
        )
    
        pipeline.push(
            {
                $addFields: {
                    owner:{$first:$owner}
                }
            }
        )
    
        pipeline.push({      
              $sort: {
                [sortBy || "createdAt"]: sortType || 1
            }}
        )
    
    videoAggregate = await Video.aggregate(pipeline)
    } catch (error) {
        throw new ApiError(500, error.message || "Internal server error in video aggregation");
    }

    const options = {
        page,
        limit,
        customLabels: {
            totalDocs: "totalVideos",
            docs: "videos",

        },
        skip: (page - 1) * limit,
        limit: parseInt(limit),
    }

    Video.aggregatePaginate(videoAggregate, options)
        .then(result => {
            // console.log("first")
            if (result?.videos?.length === 0 ) {
                return res.status(200).json(new ApiResponse(200, [], "No videos found"))
            }

            return res.status(200)
                .json(
                    new ApiResponse(
                        200,
                        result,
                        "video fetched successfully"
                    )
                )
        }).catch(error => {
            // console.log("error ::", error)
            throw new ApiError(500, error?.message || "Internal server error in video aggregate Paginate")
        })

})

const publishAVideo = asyncHandler(
    async (req, res) => {
    const { title, description} = req.body
    // TODO: get video, upload to cloudinary, create video
    const videoLocalPath = req.files?.videoFile[0]?.path

    const thumbnailLocalPath = req.files?.thumbnail[0]?.path
    // if(!videoPath){
    //     throw new ApiError(404, "Video is required")
    // }

    const uploadVideo = await uploadOnCloudinary(videoLocalPath)
    const uploadThumbnail = await uploadOnCloudinary(thumbnailLocalPath)
    if(!uploadVideo && !uploadThumbnail)
    {
        throw new ApiError(400, "Both is required")
    }



    const videoPublished = await Video.create({
        title,
        description,
        videoFile: {
            url: uploadVideo.secure_url,
            public_id: uploadVideo.public_id
        },
        thumbnail: {
            url: uploadThumbnail.secure_url,
            public_id: uploadThumbnail.public_id
        },
        duration: video.duration,
        owner: req.user._id
    })

    return res.status(201)
    .json(new ApiResponse(200, videoPublished, "Video Published Successfully"))





})

const getVideoById = asyncHandler(
    async (req, res) => {
    const { videoId } = req.params
    //TODO: get video by id
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID")
    }
    const video = await Video.findById(videoId)

    if(!video) {
        throw new ApiError(400, "Video not found")
    }

    return res.status(200)
    .json(new ApiResponse(200, video,"Video fetched successfully"))

})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: update video details like title, description, thumbnail
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID")
    }
    const video = await Video.findById(videoId)

    const {title, description}= req.body
    const thumbnailPath = req.file?.path  

    const updateThumbnail = await uploadOnCloudinary(thumbnailPath)
    
    if(!updateThumbnail){
        throw new ApiError(400, "Video file is required")
    }

    const update = {
        title: title,
        description: description,
        thumbnail: {
            public_id: updateThumbnail.public_id,
            url: updateThumbnail.secure_url
        }
    }

    const updateVideo = await Video.findByIdAndUpdate(video._id, update,{new: true})


    return res.status(200)
    .json(new ApiResponse(200, updateVideo, "Video Details Updated Successfully"))

})

const deleteVideo = asyncHandler(
    async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID")
    }

    const video = Video.findById(videoId)
    if (!video) {
        throw new ApiError(400, "Video not found")
    }

    const video_publicId = video.videoFile.public_id
    const thumbnail_publicId = video.thumbnail.public_id
    
    if(!video_publicId && !thumbnail_publicId) {
        throw new ApiError(400, "file is required")
    }
    await deleteFromCloudinary(video_publicId)
    await deleteFromCloudinary(thumbnail_publicId)
    
    await Video.findByIdAndDelete(videoId)

    return res.status(200)
    .json(new ApiResponse(200, {}, "Video Deleted Successfully"))


})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID")
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(400, "Video not found")
    }
    // Toggle the isPublish field
    video.isPublished = !video.isPublished;

    // Save the updated video
    await video.save();

    return res.status(200)
        .json(new ApiResponse(200, video, "isPublished toggle Successfully"))
})



export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}
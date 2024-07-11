import mongoose, {Schema} from "mongoose";

const videoSchema = new Schema(
    {
        videoFile:{
            type: String,
            required: true,
        },
        thumbnail:{
            type: String,
            required: true,
        },
        title:{
            type: String,
            required: true,
        },
        description:{
            type: String,  
            required: true,
        },
        duration:{
            type: String, 
        },
        views:{
                type: Number,
                default:0
            }
        ,
        isPublished:{
            type: Boolean,
            required: [true,'Password is required']
        },
        owner: {
            type: Types.Schema.ObjectId,
            ref: "User"
        }


},{timestamps:true})

videoSchema.plugin(mongooseAggregatePaginate)

export const Video = mongoose.model("Video",videoSchema);
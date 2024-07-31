import mongoose, {Schema} from "mongoose";
    import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = new Schema(
    {
        videoFile: {
            public_id: {
                type: String,
                required: true,
              },
              url: {
                type: String,
                required: true,
              }
        },
        thumbnail: {
            public_id: {
                type: String,
                required: true,
              },
              url: {
                type: String,
                required: true,
              }
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
            default: true
        },
        owner: {
            type: Types.Schema.ObjectId,
            ref: "User"
        }


},{timestamps:true})

videoSchema.plugin(mongooseAggregatePaginate)

export const Video = mongoose.model("Video",videoSchema);
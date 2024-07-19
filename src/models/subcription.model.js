import mongoose, { Schema } from "mongoose";

const subscriptionSchema = new mongoose.Schema( 
    {
        subscriber: {
            type: Schema.Types.ObjectId, // the one who is subscribing
            ref: "User"
        },
        channel: {
            type: Schema.Types.ObjectId,   // one whom "subscriber" is subscribed to
            ref: "User"
        },

    },
    {
        timestamps: true
    }

)

export const Subscription = mongoose.model("Subscription", subscriptionSchema)
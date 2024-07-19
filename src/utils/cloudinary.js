import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import path from "path";

cloudinary.config({ 
  cloud_name: "dhxy7ejxy", 
  api_key: "855377461265415", 
  api_secret: "tYwVPNR5OODMfadv0gCbsIsGs7g" 
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        console.log(process.env.CLOUDINARY_API_KEY);
        if (!localFilePath) {
            console.error("No local file path provided");
            return null;
        }

        // Ensure the file path is absolute
        const absoluteFilePath = path.resolve(localFilePath);

        // Log the absolute path
        console.log("Uploading file to Cloudinary from: ", absoluteFilePath);

        // Ensure the file exists
        if (!fs.existsSync(absoluteFilePath)) {
            console.error("File does not exist: ", absoluteFilePath);
            return null;
        }

        const response = await cloudinary.uploader.upload(absoluteFilePath, {
            resource_type: "auto"
        });

        console.log("File uploaded to Cloudinary: ", response.url);

        fs.unlinkSync(absoluteFilePath);
        return response;

    } catch (error) {
        console.error("Error uploading file to Cloudinary: ", error);
        if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath); // remove the locally saved temporary file as the upload operation got failed
        }
        return null;
    }
}

export { uploadOnCloudinary };

const cloudinary = require("cloudinary").v2;

async function cloudinaryConfig() {
  try {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    console.log("Cloudinary Connected Successfylly");
  } catch (error) {
    console.log("Cloudinary CanNot connect");
  }
}


module.exports = cloudinaryConfig;
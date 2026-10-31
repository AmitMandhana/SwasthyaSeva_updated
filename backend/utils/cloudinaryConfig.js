const cloudinary = require('cloudinary').v2;

function initCloudinary() {
  const cloudinaryUrl = process.env.CLOUDINARY_URL;
  
  if (!cloudinaryUrl) {
    console.warn('[Cloudinary] CLOUDINARY_URL not set in environment');
    return false;
  }

  cloudinary.config({
    cloudinary_url: cloudinaryUrl,
  });

  return true;
}

function generateUploadSignature() {
  if (!process.env.CLOUDINARY_URL) {
    throw new Error('CLOUDINARY_URL not configured');
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const apiSecret = cloudinary.config().api_secret;
  const apiKey = cloudinary.config().api_key;
  const cloudName = cloudinary.config().cloud_name;

  const paramsToSign = {
    timestamp,
  };

  const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret);

  return {
    timestamp,
    signature,
    api_key: apiKey,
    cloud_name: cloudName,
  };
}

module.exports = {
  initCloudinary,
  generateUploadSignature,
};

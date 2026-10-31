const { generateUploadSignature } = require('../../utils/cloudinaryConfig');

async function getCloudinarySignatureHandler(req, res) {
  try {
    const signatureData = generateUploadSignature();
    console.log(`[Cloudinary Signature] Generated for admin=${req.adminId}`);
    return res.status(200).json(signatureData);
  } catch (err) {
    console.error('[Cloudinary Signature] ERROR', err);
    if (err.message.includes('not configured')) {
      return res.status(503).json({ error: 'Service Unavailable', message: 'Cloudinary not configured' });
    }
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

module.exports = {
  getCloudinarySignatureHandler,
};

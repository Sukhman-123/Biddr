const crypto = require('crypto');

const CLOUDINARY_UPLOAD_FOLDER = 'biddr/players';
const MAX_PLAYER_IMAGE_BYTES = 2 * 1024 * 1024;
const SUPPORTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const getConfig = () => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    const error = new Error('Player photo uploads are not configured yet');
    error.status = 503;
    throw error;
  }

  return { cloudName, apiKey, apiSecret };
};

const detectImageType = (buffer) => {
  if (!Buffer.isBuffer(buffer)) return null;
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) return 'image/jpeg';
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) return 'image/png';
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) return 'image/webp';
  return null;
};

const signParams = (params, apiSecret) => {
  const serialized = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');
  return crypto.createHash('sha1').update(`${serialized}${apiSecret}`).digest('hex');
};

const cloudinaryRequest = async (action, fields, file) => {
  const { cloudName, apiKey, apiSecret } = getConfig();
  const timestamp = Math.floor(Date.now() / 1000);
  const signedFields = { ...fields, timestamp };
  const form = new FormData();

  Object.entries(signedFields).forEach(([key, value]) => form.append(key, String(value)));
  form.append('api_key', apiKey);
  form.append('signature', signParams(signedFields, apiSecret));
  if (file) {
    form.append('file', new Blob([file.buffer], { type: file.mimetype }), file.originalname);
  }

  let response;
  try {
    response = await fetch(
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/${action}`,
      { method: 'POST', body: form },
    );
  } catch (_error) {
    const error = new Error('Could not reach the image service. Please try again');
    error.status = 502;
    throw error;
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload?.error?.message || 'The image service rejected the upload');
    error.status = 502;
    throw error;
  }
  return payload;
};

const optimizeCloudinaryUrl = (secureUrl) => {
  if (typeof secureUrl !== 'string') return '';
  return secureUrl.replace(
    '/image/upload/',
    '/image/upload/c_fill,g_auto,w_800,h_800,q_auto,f_auto/',
  );
};

const uploadPlayerImage = async (file) => {
  if (!file?.buffer) {
    const error = new Error('Choose a player photo to upload');
    error.status = 400;
    throw error;
  }
  if (file.size > MAX_PLAYER_IMAGE_BYTES) {
    const error = new Error('Player photo must be 2 MB or smaller');
    error.status = 400;
    throw error;
  }

  const detectedType = detectImageType(file.buffer);
  if (!detectedType || !SUPPORTED_IMAGE_TYPES.has(detectedType)) {
    const error = new Error('Player photo must be a JPG, PNG, or WebP image');
    error.status = 400;
    throw error;
  }

  const payload = await cloudinaryRequest(
    'upload',
    { folder: CLOUDINARY_UPLOAD_FOLDER },
    { ...file, mimetype: detectedType },
  );
  if (!payload.secure_url || !payload.public_id) {
    const error = new Error('The image service returned an incomplete upload');
    error.status = 502;
    throw error;
  }

  return {
    photoUrl: optimizeCloudinaryUrl(payload.secure_url),
    photoPublicId: payload.public_id,
  };
};

const deletePlayerImage = async (publicId) => {
  if (!publicId) return false;
  const payload = await cloudinaryRequest('destroy', { public_id: publicId });
  return payload.result === 'ok' || payload.result === 'not found';
};

module.exports = {
  MAX_PLAYER_IMAGE_BYTES,
  SUPPORTED_IMAGE_TYPES,
  uploadPlayerImage,
  deletePlayerImage,
  detectImageType,
  optimizeCloudinaryUrl,
};

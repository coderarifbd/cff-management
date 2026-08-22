'use server'

import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadFileAction(formData: FormData) {
  try {
    const file = formData.get('file') as File;

    if (!file) {
      return { success: false, error: 'No file found' };
    }

    // Convert file to base64 for Cloudinary upload
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');
    const mimeType = file.type;
    const dataUri = `data:${mimeType};base64,${base64}`;

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: 'cff-management',
      resource_type: 'auto', // supports images and PDFs
      public_id: `${Date.now()}-${file.name.replace(/\s+/g, '_').replace(/\.[^/.]+$/, '')}`,
    });

    return { success: true, url: result.secure_url };
  } catch (error) {
    console.error('File upload error:', error);
    return { success: false, error: 'Upload failed' };
  }
}

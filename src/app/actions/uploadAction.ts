'use server'

import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export async function uploadFileAction(formData: FormData) {
  try {
    const file = formData.get('file') as File;

    if (!file) {
      return { success: false, error: 'No file found' };
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const filename = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
    const uploadDir = join(process.cwd(), 'public', 'uploads');
    
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (e) {
      // directory might already exist
    }

    const path = join(uploadDir, filename);
    await writeFile(path, buffer);

    return { success: true, url: `/uploads/${filename}` };
  } catch (error) {
    console.error('File upload error:', error);
    return { success: false, error: 'Upload failed' };
  }
}

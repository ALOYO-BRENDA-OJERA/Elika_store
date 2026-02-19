import { promises as fs } from 'fs';
import path from 'path';

const uploadDir = path.join(process.cwd(), 'public', 'uploads');

export const ensureUploadDir = async () => {
  await fs.mkdir(uploadDir, { recursive: true });
};

export const saveUploadFile = async (file: File) => {
  await ensureUploadDir();
  const safeOriginalName = (file.name || 'image')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(-120);
  const uniquePrefix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const filename = `${uniquePrefix}-${safeOriginalName}`;
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const filePath = path.join(uploadDir, filename);
  await fs.writeFile(filePath, buffer);
  return `/uploads/${filename}`;
};

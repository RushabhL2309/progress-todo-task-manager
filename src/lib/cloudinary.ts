import { v2 as cloudinary } from "cloudinary";

export function isCloudinaryConfigured(): boolean {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

export function getCloudinary() {
  if (!isCloudinaryConfigured()) {
    throw new Error(
      "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env"
    );
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  return cloudinary;
}

export function getCloudinaryFolder(subfolder?: string): string {
  const base = process.env.CLOUDINARY_FOLDER?.trim() || "progress tracker";
  return subfolder ? `${base}/${subfolder}` : base;
}

/** Ready for future task attachments / avatars — not used in v1 UI */
export async function uploadImage(
  file: string,
  folder?: string
): Promise<{ url: string; publicId: string }> {
  const cld = getCloudinary();
  const result = await cld.uploader.upload(file, { folder: folder ?? getCloudinaryFolder() });
  return { url: result.secure_url, publicId: result.public_id };
}

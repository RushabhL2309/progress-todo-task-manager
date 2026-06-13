import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { getCloudinary, getCloudinaryFolder, isCloudinaryConfigured } from "@/lib/cloudinary";
import { hasModule } from "@/lib/permissions";

export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;
  if (!hasModule(auth.user, "chat")) {
    return NextResponse.json({ error: "Module not enabled" }, { status: 403 });
  }

  if (!isCloudinaryConfigured()) {
    return NextResponse.json(
      { error: "Cloudinary not configured. Add credentials to .env" },
      { status: 503 }
    );
  }

  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = `data:${file.type || "image/jpeg"};base64,${buffer.toString("base64")}`;

    const cld = getCloudinary();
    const result = await cld.uploader.upload(base64, {
      folder: getCloudinaryFolder("chat"),
      transformation: [{ quality: "auto", fetch_format: "auto" }],
    });

    return NextResponse.json({
      url: result.secure_url,
      publicId: result.public_id,
    });
  } catch (error) {
    console.error("POST /api/chat/upload", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

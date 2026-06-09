import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/demo-mode";
import { connectDB } from "@/lib/mongodb";

export async function GET(request: Request) {
  const demo = isDemoMode(request);
  const hasUri = Boolean(process.env.MONGODB_URI);

  if (demo) {
    return NextResponse.json({
      demo: true,
      database: { configured: hasUri, status: "skipped" },
    });
  }

  if (!hasUri) {
    return NextResponse.json(
      {
        demo: false,
        database: { configured: false, status: "missing_uri" },
        error: "MONGODB_URI is not set",
      },
      { status: 503 }
    );
  }

  try {
    await connectDB();
    return NextResponse.json({
      demo: false,
      database: { configured: true, status: "connected" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Connection failed";
    return NextResponse.json(
      {
        demo: false,
        database: { configured: true, status: "error" },
        error: message,
      },
      { status: 503 }
    );
  }
}

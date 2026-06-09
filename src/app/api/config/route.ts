import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/demo-mode";

export async function GET(request: Request) {
  const demo = isDemoMode(request);
  return NextResponse.json({
    demo,
    hasMongoUri: Boolean(process.env.MONGODB_URI),
  });
}

import { NextResponse } from "next/server";
import { getLiveSessionUser } from "@/lib/live-session";

export async function GET(request: Request) {
  const user = await getLiveSessionUser(request);
  if (!user) {
    return NextResponse.json({ user: null, deactivated: true }, { status: 401 });
  }
  return NextResponse.json({ user });
}

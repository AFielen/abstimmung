import { NextResponse, type NextRequest } from "next/server";
import { clearSession } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  await clearSession();
  return NextResponse.redirect(new URL("/", req.url));
}

export async function POST(req: NextRequest) {
  await clearSession();
  return NextResponse.redirect(new URL("/", req.url));
}

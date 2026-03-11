import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getOAuthClient } from "@/lib/google";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  const oauth2Client = getOAuthClient();
  const { tokens } = await oauth2Client.getToken(code);

  const cookieStore = await cookies();

  if (tokens.access_token) {
    cookieStore.set("google_access_token", tokens.access_token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
    });
  }

  if (tokens.refresh_token) {
    cookieStore.set("google_refresh_token", tokens.refresh_token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
    });
  }

  return NextResponse.redirect(new URL("/", req.url));
}
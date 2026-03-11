import { NextResponse } from "next/server";
import { getOAuthClient } from "@/lib/google";

export async function GET() {
  const oauth2Client = getOAuthClient();

  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/calendar.events"],
  });

  return NextResponse.redirect(url);
}
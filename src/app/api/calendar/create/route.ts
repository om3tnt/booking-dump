import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { google } from "googleapis";
import { getOAuthClient } from "@/lib/google";

function parseDdMmYyyyToParts(date: string) {
  const match = date.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;

  const [, dd, mm, yyyy] = match;
  return {
    day: Number(dd),
    month: Number(mm),
    year: Number(yyyy),
  };
}

function buildEventDateTimes(date: string, time: string) {
  const dateParts = parseDdMmYyyyToParts(date);
  if (!dateParts) return null;

  const [hoursStr, minutesStr] = time.split(":");
  const hours = Number(hoursStr);
  const minutes = Number(minutesStr);

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  const start = new Date(
    dateParts.year,
    dateParts.month - 1,
    dateParts.day,
    hours,
    minutes,
    0
  );

  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);

  const toLocalDateTime = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    const ss = String(d.getSeconds()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}`;
  };

  return {
    startDateTime: toLocalDateTime(start),
    endDateTime: toLocalDateTime(end),
  };
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("google_access_token")?.value;
    const refreshToken = cookieStore.get("google_refresh_token")?.value;

    if (!accessToken && !refreshToken) {
      return NextResponse.json(
        { error: "Google account not connected." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { name, phone, date, time, address, payment, notes } = body;

    if (!name || !phone || !date || !time || !address || !payment) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 }
      );
    }

    const dateTimes = buildEventDateTimes(date, time);

    if (!dateTimes) {
      return NextResponse.json(
        { error: "Invalid date or time format." },
        { status: 400 }
      );
    }

    const oauth2Client = getOAuthClient();
    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    const descriptionLines = [
      `Cliente: ${name}`,
      `Teléfono: ${phone}`,
      `Pago: ${payment}`,
      notes ? `Notas: ${notes}` : "",
    ].filter(Boolean);

    const event = await calendar.events.insert({
      calendarId: "primary",
      requestBody: {
        summary: `Evento - ${name}`,
        location: address,
        description: descriptionLines.join("\n"),
        start: {
          dateTime: dateTimes.startDateTime,
          timeZone: "America/Chicago",
        },
        end: {
          dateTime: dateTimes.endDateTime,
          timeZone: "America/Chicago",
        },
      },
    });

    return NextResponse.json({
      ok: true,
      htmlLink: event.data.htmlLink ?? null,
      eventId: event.data.id ?? null,
    });
  } catch (error) {
    console.error("Calendar create error:", error);
    return NextResponse.json(
      { error: "Failed to create calendar event." },
      { status: 500 }
    );
  }
}
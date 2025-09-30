// app/api/queue/route.ts
import { NextResponse } from "next/server";
import { getSheetsClient } from "@/app/lib/googleSheets";

const SHEET_ID = "1ok5gX2BNOLbqQrf6YZI1EZmMjlrDq7e33jIvUYbwjw0";

function formatTimestamp(date: Date) {
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "Asia/Seoul",
  });
}

function isToday(ts: string) {
  if (!ts) return false;
  const d = new Date(ts);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export async function POST(req: Request) {
  const { action, currentQueue } = await req.json();
  const sheets = await getSheetsClient();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "Sheet1!A:C",
  });



  const rows = res.data.values || [];
  const header = rows[0];
  let data = rows.slice(1).map((r) => ({
    "Nomor Antrian": r[0] || "",
    Timestamp: r[1] || "",
    Mark: r[2] || "",
  }));

  // filter today's
  let todayData = data.filter((r) => isToday(r["Timestamp"]));

  if (action === "Attend" || action === "Absent") {
    const idx = data.findIndex((r) => r["Nomor Antrian"] === currentQueue);
    if (idx >= 0) {
      data[idx].Mark = action;
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: `Sheet1!C${idx + 2}`, // C column (Mark), row+2 (because header)
        valueInputOption: "RAW",
        requestBody: { values: [[action]] },
      });
    }
  } else if (action === "New") {
    let lastQueue = todayData.length > 0 ? todayData[todayData.length - 1]["Nomor Antrian"] : "A0000";
    const match = lastQueue.match(/^([A-Z]+)(\d+)$/);
    let newQueue = "A0001";
    if (match) {
      const [, prefix, numStr] = match;
      const nextNum = (parseInt(numStr, 10) + 1)
        .toString()
        .padStart(numStr.length, "0");
      newQueue = `${prefix}${nextNum}`;
    }

    const timestamp = formatTimestamp(new Date());

    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: "Sheet1!A:C",
      valueInputOption: "RAW",
      requestBody: {
        values: [[newQueue, timestamp, ""]],
      },
    });

    return NextResponse.json({ newQueue });
  }

  const remaining = data
    .filter((r) => isToday(r["Timestamp"]))
    .filter((r) => !["Attend", "Absent"].includes(r["Mark"]))
    .map((r) => r["Nomor Antrian"]);

  return NextResponse.json({
    currentQueue: remaining.length > 0 ? remaining[0] : null,
    remaining,
  });
}

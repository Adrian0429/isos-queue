import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import * as XLSX from "xlsx";

function formatTimestamp(date: Date) {
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "Asia/Seoul", // adjust to your timezone
  });
}

function isToday(dateString: string) {
  if (!dateString) return false;
  const d = new Date(dateString);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export async function POST(req: Request) {
  const { action, currentQueue } = await req.json();

  const filePath = path.join(process.cwd(), "public", "queue.xlsx");
  const fileBuffer = await fs.readFile(filePath);
  const workbook = XLSX.read(fileBuffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // full sheet data (kept for saving)
  let fullData: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

  // filter today's rows only
  let todayData = fullData.filter((r) => isToday(r["Timestamp"]));

  if (action === "Attend" || action === "Absent") {
    // ✅ update in fullData, not just todayData
    fullData = fullData.map((row) => {
      if (row["Nomor Antrian"] === currentQueue) {
        return { ...row, Mark: action };
      }
      return row;
    });
  } else if (action === "New") {
    // generate next queue number for today only
    let lastQueue = "A0000";
    if (todayData.length > 0) {
      const last = todayData[todayData.length - 1];
      if (last["Nomor Antrian"]) lastQueue = last["Nomor Antrian"];
    }

    const match = lastQueue.match(/^([A-Z]+)(\d+)$/);
    let newQueue = "A0001";
    if (match) {
      const [, prefix, numStr] = match;
      const nextNum = (parseInt(numStr, 10) + 1)
        .toString()
        .padStart(numStr.length, "0");
      newQueue = `${prefix}${nextNum}`;
    }

    const now = new Date();
    const timestamp = formatTimestamp(now); // ✅ friendly format

    const newRow = {
      "Nomor Antrian": newQueue,
      Timestamp: timestamp,
      Mark: "",
    };

    // push to both todayData and fullData
    fullData.push(newRow);
    todayData.push(newRow);

    // save sheet
    const newSheet = XLSX.utils.json_to_sheet(fullData, {
      header: ["Nomor Antrian", "Timestamp", "Mark"],
    });
    workbook.Sheets[sheetName] = newSheet;
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    await fs.writeFile(filePath, buffer);

    return NextResponse.json({ newQueue });
  }

  // ✅ save updated fullData for Attend/Absent
  const newSheet = XLSX.utils.json_to_sheet(fullData, {
    header: ["Nomor Antrian", "Timestamp", "Mark"],
  });
  workbook.Sheets[sheetName] = newSheet;
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  await fs.writeFile(filePath, buffer);

  const remaining = fullData
    .filter(
      (r) =>
        isToday(r["Timestamp"]) &&
        (!r["Mark"] || (r["Mark"] !== "Attend" && r["Mark"] !== "Absent"))
    )
    .map((r) => r["Nomor Antrian"]);

  return NextResponse.json({
    currentQueue: remaining.length > 0 ? remaining[0] : null,
    remaining,
  });
}

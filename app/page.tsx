// app/page.tsx
import QueueUI from "./queue-ui";
import { getSheetsClient } from "./lib/googleSheets";

const SHEET_ID = "1ok5gX2BNOLbqQrf6YZI1EZmMjlrDq7e33jIvUYbwjw0"; // from Google Sheets URL

export default async function Page() {
  const sheets = await getSheetsClient();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "Sheet1!A:C", // Nomor Antrian, Timestamp, Mark
  });

  const rows = res.data.values || [];
  const header = rows[0] || [];
  const jsonData = rows.slice(1).map((r) => ({
    "Nomor Antrian": r[0] || "",
    Timestamp: r[1] || "",
    Mark: r[2] || "",
  }));

  // today’s date in Asia/Seoul timezone (YYYY-MM-DD)
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Seoul",
  });

  // filter rows that are from today and not already attended/absent
  const filtered = jsonData
    .filter((row) => {
      if (!row.Timestamp) return false;
      const rowDate = new Date(row.Timestamp).toLocaleDateString("en-CA", {
        timeZone: "Asia/Seoul",
      });
      return rowDate === today;
    })
    .filter((row) => !["Attend", "Absent"].includes(row.Mark));

  // convert timestamp into friendly format
  const friendly = filtered.map((r) => ({
    ...r,
    Timestamp: new Date(r.Timestamp).toLocaleString("en-US", {
      timeZone: "Asia/Seoul",
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
  }));

  let currentQueue =
    friendly.length > 0 ? friendly[0]["Nomor Antrian"] : "No Queue";

  return (
    <QueueUI
      initialQueue={currentQueue}
      queues={friendly.map((r) => r["Nomor Antrian"])}
    />
  );
}

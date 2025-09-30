// app/page.tsx
import { promises as fs } from "fs";
import path from "path";
import * as XLSX from "xlsx";
import QueueUI from "./queue-ui"; // client component

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

export default async function Page() {
  const filePath = path.join(process.cwd(), "public", "queue.xlsx");
  const fileBuffer = await fs.readFile(filePath);
  const workbook = XLSX.read(fileBuffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  const jsonData: string[][] = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: "",
  }) as string[][];

  // remove header row and filter for today's data only
  const filtered = jsonData
    .slice(1)
    .filter((row) => {
      const nomor = row[0];
      const timestamp = row[1];
      const mark = row[2];

      return (
        nomor &&
        isToday(timestamp) &&
        (!mark || (mark !== "Attend" && mark !== "Absent"))
      );
    })
    .map((row) => row[0]);

  let currentQueue = filtered.length > 0 ? filtered[0] : "No Queue";

  return <QueueUI initialQueue={currentQueue} queues={filtered} />;
}

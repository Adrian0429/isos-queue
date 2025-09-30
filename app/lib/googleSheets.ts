// lib/googleSheets.ts
import { google } from "googleapis";
import path from "path";
import fs from "fs";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

function getAuth() {
  const keyPath = path.join(process.cwd(), "credentials.json"); // service account json
  const keyFile = fs.readFileSync(keyPath, "utf-8");
  const credentials = JSON.parse(keyFile);

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: SCOPES,
  });

  return auth;
}

export async function getSheetsClient() {
  const auth = getAuth();
  return google.sheets({ version: "v4", auth });
}

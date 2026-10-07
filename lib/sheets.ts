import "server-only";
import { google } from "googleapis";
import { columnLetter, type CellValue } from "@/lib/sheet-cells";
import type { CellWrite } from "@/lib/take-attendance";

const SCOPES = {
  read: "https://www.googleapis.com/auth/spreadsheets.readonly",
  // Only the attendance write-back asks for this. The Sheet itself must
  // also be shared with the service account as Editor; keep the Roster
  // Sheet shared as Viewer.
  write: "https://www.googleapis.com/auth/spreadsheets",
} as const;

export function sheetsClient(access: keyof typeof SCOPES = "read") {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (!email || !key) {
    throw new Error(
      "Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY",
    );
  }
  const auth = new google.auth.JWT({
    email,
    key: key.replace(/\\n/g, "\n"),
    scopes: [SCOPES[access]],
  });
  return google.sheets({ version: "v4", auth });
}

type SheetsApi = ReturnType<typeof sheetsClient>;

// Reads row 1 of a tab.
export async function readHeaderRow(
  api: SheetsApi,
  spreadsheetId: string,
  tab: string,
  valueRenderOption: "FORMATTED_VALUE" | "UNFORMATTED_VALUE" = "FORMATTED_VALUE",
): Promise<CellValue[]> {
  const res = await api.spreadsheets.values.get({
    spreadsheetId,
    range: `'${tab}'!1:1`,
    valueRenderOption,
  });
  return (res.data.values?.[0] ?? []) as CellValue[];
}

// Reads only the given columns (from row 2 down), so columns a sync doesn't
// need (e.g. phone numbers, names) are never fetched. Returns column index
// -> cells, plus the number of data rows.
export async function readColumns(
  api: SheetsApi,
  spreadsheetId: string,
  tab: string,
  indices: number[],
  valueRenderOption: "FORMATTED_VALUE" | "UNFORMATTED_VALUE" = "FORMATTED_VALUE",
) {
  const res = await api.spreadsheets.values.batchGet({
    spreadsheetId,
    ranges: indices.map((i) => {
      const col = columnLetter(i);
      return `'${tab}'!${col}2:${col}`;
    }),
    majorDimension: "COLUMNS",
    valueRenderOption,
  });
  const columns = new Map(
    indices.map((i, n) => [i, (res.data.valueRanges?.[n]?.values?.[0] ?? []) as CellValue[]]),
  );
  const rowCount = Math.max(0, ...[...columns.values()].map((c) => c.length));
  return { columns, rowCount };
}

// Writes single cells as raw values, so booleans land as TRUE/FALSE
// (ticking checkbox cells) and "" clears a cell.
export async function writeCells(api: SheetsApi, spreadsheetId: string, data: CellWrite[]) {
  if (data.length === 0) return;
  await api.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: { valueInputOption: "RAW", data },
  });
}

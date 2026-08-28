export type Encoding = "auto" | "utf-8" | "windows-1252";
export type TransformKind = "none" | "trim" | "upper" | "lower" | "date-dmy" | "date-mdy" | "number" | "replace";

export interface DataSet {
  fileName: string;
  encoding: string;
  headers: string[];
  rows: Record<string, string>[];
}

export interface FieldMapping {
  target: string;
  source: string | null;
  transform: TransformKind;
  required: boolean;
  defaultValue: string;
  find: string;
  replace: string;
}

export interface Recipe {
  schema: "import-transform-ledger/recipe";
  version: 1;
  name: string;
  createdAt: string;
  sourceHeaders: string[];
  targetHeaders: string[];
  mappings: FieldMapping[];
  dedupeKeys: string[];
}

export interface RejectedRow {
  sourceRow: number;
  reasons: string[];
  source: Record<string, string>;
  output: Record<string, string>;
  duplicate: boolean;
}

export interface ProcessResult {
  accepted: Record<string, string>[];
  rejected: RejectedRow[];
  total: number;
  duplicates: number;
}

const delimiters = [",", ";", "\t"];
const transformKinds: TransformKind[] = ["none", "trim", "upper", "lower", "date-dmy", "date-mdy", "number", "replace"];

export function decodeBuffer(buffer: ArrayBuffer, encoding: Encoding): { text: string; encoding: string } {
  if (encoding !== "auto") {
    return { text: new TextDecoder(encoding, { fatal: false }).decode(buffer), encoding };
  }
  try {
    return { text: new TextDecoder("utf-8", { fatal: true }).decode(buffer), encoding: "utf-8" };
  } catch {
    return { text: new TextDecoder("windows-1252").decode(buffer), encoding: "windows-1252" };
  }
}

function countDelimiter(line: string, delimiter: string): number {
  let count = 0;
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    if (line[i] === '"') quoted = !quoted;
    else if (!quoted && line[i] === delimiter) count += 1;
  }
  return count;
}

export function detectDelimiter(text: string): string {
  const line = text.replace(/^\uFEFF/, "").split(/\r?\n/, 1)[0] ?? "";
  return delimiters.reduce((best, item) => countDelimiter(line, item) > countDelimiter(line, best) ? item : best, ",");
}

export function parseCSV(text: string, delimiter = detectDelimiter(text)): string[][] {
  const input = text.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"' && field.length === 0) quoted = true;
    else if (char === delimiter) {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field.replace(/\r$/, ""));
      if (row.some((cell) => cell.length > 0)) rows.push(row);
      row = [];
      field = "";
    } else field += char;
  }
  if (quoted) throw new Error("The CSV ends inside a quoted field. Check the final row and closing quote.");
  row.push(field.replace(/\r$/, ""));
  if (row.some((cell) => cell.length > 0)) rows.push(row);
  return rows;
}

export function createDataSet(text: string, fileName = "source.csv", encoding = "utf-8"): DataSet {
  const matrix = parseCSV(text);
  if (matrix.length === 0) throw new Error("This file is empty. Choose a CSV with a header row.");
  const rawHeaders = matrix[0] ?? [];
  const headers = rawHeaders.map((value, index) => value.trim() || `Column ${index + 1}`);
  const duplicate = headers.find((header, index) => headers.indexOf(header) !== index);
  if (duplicate) throw new Error(`The header “${duplicate}” appears more than once. Rename duplicate columns before continuing.`);
  if (headers.length < 1) throw new Error("No columns were found in the header row.");
  const widthMismatch = matrix.slice(1).findIndex((values) => values.length !== headers.length);
  if (widthMismatch !== -1) {
    const sourceRow = widthMismatch + 2;
    const fields = matrix[sourceRow - 1]?.length ?? 0;
    throw new Error(`Source row ${sourceRow} has ${fields} fields, but the header has ${headers.length}. Fix the row-width mismatch before continuing so no cells are lost.`);
  }
  const rows = matrix.slice(1).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
  return { fileName, encoding, headers, rows };
}

export function initialMappings(sourceHeaders: string[], targetHeaders: string[]): FieldMapping[] {
  return targetHeaders.map((target) => {
    const exact = sourceHeaders.find((source) => source.toLocaleLowerCase() === target.toLocaleLowerCase()) ?? null;
    return { target, source: exact, transform: "trim", required: false, defaultValue: "", find: "", replace: "" };
  });
}

function parseDate(value: string, order: "dmy" | "mdy"): string | null {
  const match = value.trim().match(/^(\d{1,4})[\/.\-](\d{1,2})[\/.\-](\d{1,4})$/);
  if (!match) return null;
  let year: number;
  let month: number;
  let day: number;
  if ((match[1] ?? "").length === 4) {
    year = Number(match[1]); month = Number(match[2]); day = Number(match[3]);
  } else {
    year = Number(match[3]);
    day = Number(match[order === "dmy" ? 1 : 2]);
    month = Number(match[order === "dmy" ? 2 : 1]);
  }
  if (year < 100) year += year >= 70 ? 1900 : 2000;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function transformValue(value: string, mapping: FieldMapping): { value: string; error?: string } {
  let output = value === "" ? mapping.defaultValue : value;
  switch (mapping.transform) {
    case "trim": output = output.trim(); break;
    case "upper": output = output.trim().toLocaleUpperCase(); break;
    case "lower": output = output.trim().toLocaleLowerCase(); break;
    case "date-dmy":
    case "date-mdy": {
      if (!output.trim()) break;
      const date = parseDate(output, mapping.transform === "date-dmy" ? "dmy" : "mdy");
      if (!date) return { value: output, error: `${mapping.target}: “${output}” is not a valid ${mapping.transform === "date-dmy" ? "day/month/year" : "month/day/year"} date` };
      output = date;
      break;
    }
    case "number": {
      if (!output.trim()) break;
      const normalized = output.replace(/[,$£€\s]/g, "");
      if (!/^-?(?:\d+|\d*\.\d+)$/.test(normalized)) return { value: output, error: `${mapping.target}: “${output}” is not a valid number` };
      output = String(Number(normalized));
      break;
    }
    case "replace": output = mapping.find ? output.split(mapping.find).join(mapping.replace) : output; break;
    default: break;
  }
  if (mapping.required && output.trim() === "") return { value: output, error: `${mapping.target}: required value is blank` };
  return { value: output };
}

export function processRows(rows: Record<string, string>[], mappings: FieldMapping[], dedupeKeys: string[]): ProcessResult {
  const accepted: Record<string, string>[] = [];
  const rejected: RejectedRow[] = [];
  const seen = new Map<string, number>();
  rows.forEach((source, index) => {
    const output: Record<string, string> = {};
    const reasons: string[] = [];
    mappings.forEach((mapping) => {
      const raw = mapping.source ? source[mapping.source] ?? "" : "";
      const result = transformValue(raw, mapping);
      output[mapping.target] = result.value;
      if (result.error) reasons.push(result.error);
    });
    let duplicate = false;
    // Only rows that have passed every transform and required-field rule may
    // claim a key. An invalid row must never cause the only valid occurrence
    // of a business record to be rejected.
    if (reasons.length === 0 && dedupeKeys.length > 0) {
      const key = dedupeKeys.map((field) => output[field] ?? "").join("\u001f");
      if (key.replaceAll("\u001f", "") !== "") {
        const first = seen.get(key);
        if (first !== undefined) {
          duplicate = true;
          reasons.push(`Duplicate of source row ${first + 2} by ${dedupeKeys.join(" + ")}`);
        } else seen.set(key, index);
      }
    }
    if (reasons.length) rejected.push({ sourceRow: index + 2, reasons, source, output, duplicate });
    else accepted.push(output);
  });
  return { accepted, rejected, total: rows.length, duplicates: rejected.filter((row) => row.duplicate).length };
}

function escapeCell(value: unknown): string {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function toCSV(headers: string[], rows: Record<string, unknown>[]): string {
  return [headers.map(escapeCell).join(","), ...rows.map((row) => headers.map((header) => escapeCell(row[header])).join(","))].join("\r\n") + "\r\n";
}

export function recipeJSON(recipe: Recipe): string {
  return JSON.stringify(recipe, null, 2) + "\n";
}

export function validateRecipe(value: unknown): Recipe {
  if (!value || typeof value !== "object") throw new Error("Recipe must be a JSON object.");
  const item = value as Record<string, unknown>;
  if (item.schema !== "import-transform-ledger/recipe" || item.version !== 1) {
    throw new Error("This is not a supported Import Transform Ledger recipe (version 1).");
  }
  if (typeof item.name !== "string" || !item.name.trim()) throw new Error("Recipe name must be a non-empty string.");
  if (typeof item.createdAt !== "string" || !/^\d{4}-\d{2}-\d{2}T/.test(item.createdAt) || Number.isNaN(Date.parse(item.createdAt))) {
    throw new Error("Recipe createdAt must be a valid ISO date and time.");
  }
  const sourceHeaders = validateUniqueStrings(item.sourceHeaders, "sourceHeaders", false);
  const targetHeaders = validateUniqueStrings(item.targetHeaders, "targetHeaders", false);
  if (!Array.isArray(item.mappings)) throw new Error("Recipe mappings must be an array.");
  if (item.mappings.length !== targetHeaders.length) throw new Error("Recipe mappings must contain exactly one mapping for every target header.");

  const mappings = item.mappings.map((raw, index) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error(`Recipe mapping ${index + 1} must be an object.`);
    const mapping = raw as Record<string, unknown>;
    if (typeof mapping.target !== "string" || !targetHeaders.includes(mapping.target)) {
      throw new Error(`Recipe mapping ${index + 1} targets an undeclared target header.`);
    }
    if (mapping.source !== null && (typeof mapping.source !== "string" || !sourceHeaders.includes(mapping.source))) {
      throw new Error(`Recipe mapping for “${mapping.target}” references an undeclared source header.`);
    }
    if (typeof mapping.transform !== "string" || !transformKinds.includes(mapping.transform as TransformKind)) {
      throw new Error(`Recipe mapping for “${mapping.target}” uses an unsupported transform.`);
    }
    if (typeof mapping.required !== "boolean" || typeof mapping.defaultValue !== "string" || typeof mapping.find !== "string" || typeof mapping.replace !== "string") {
      throw new Error(`Recipe mapping for “${mapping.target}” has invalid rule fields.`);
    }
    return mapping as unknown as FieldMapping;
  });
  const mappedTargets = mappings.map((mapping) => mapping.target);
  if (new Set(mappedTargets).size !== mappedTargets.length || targetHeaders.some((header) => !mappedTargets.includes(header))) {
    throw new Error("Recipe mappings must cover each target header exactly once.");
  }
  const dedupeKeys = validateUniqueStrings(item.dedupeKeys, "dedupeKeys", true);
  const unknownKey = dedupeKeys.find((key) => !targetHeaders.includes(key));
  if (unknownKey) throw new Error(`Recipe dedupe key “${unknownKey}” is not a target header.`);

  return {
    schema: "import-transform-ledger/recipe",
    version: 1,
    name: item.name,
    createdAt: item.createdAt,
    sourceHeaders,
    targetHeaders,
    mappings,
    dedupeKeys,
  };
}

function validateUniqueStrings(value: unknown, field: string, allowEmpty: boolean): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || !item.trim())) {
    throw new Error(`Recipe ${field} must be an array of non-empty strings.`);
  }
  if (!allowEmpty && value.length === 0) throw new Error(`Recipe ${field} must not be empty.`);
  const strings = value as string[];
  if (new Set(strings).size !== strings.length) throw new Error(`Recipe ${field} must not contain duplicates.`);
  return strings;
}

export async function sha256(text: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

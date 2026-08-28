import { describe, expect, it } from "vitest";
import {
  createDataSet,
  decodeBuffer,
  initialMappings,
  parseCSV,
  processRows,
  recipeJSON,
  toCSV,
  transformValue,
  validateRecipe,
  type FieldMapping,
  type Recipe,
} from "../src/core";

const baseMapping: FieldMapping = {
  target: "value",
  source: "source",
  transform: "trim",
  required: false,
  defaultValue: "",
  find: "",
  replace: "",
};

describe("CSV parsing", () => {
  it("parses quoted commas, escaped quotes, and line breaks", () => {
    expect(parseCSV('name,note\r\n"Lee, Ana","Said ""yes"""\r\n')).toEqual([
      ["name", "note"],
      ["Lee, Ana", 'Said "yes"'],
    ]);
  });

  it("detects semicolon exports and rejects unclosed quotes", () => {
    expect(createDataSet("id;city\n1;Malmö").headers).toEqual(["id", "city"]);
    expect(() => parseCSV('id,name\n1,"open')).toThrow(/closing quote/);
  });

  it("keeps legacy Windows-1252 text safe", () => {
    const bytes = Uint8Array.from([0x6e, 0x61, 0x6d, 0x65, 0x0a, 0x80]).buffer;
    const decoded = decodeBuffer(bytes, "auto");
    expect(decoded.encoding).toBe("windows-1252");
    expect(decoded.text).toContain("€");
  });

  it("reports duplicate headers", () => {
    expect(() => createDataSet("id,id\n1,2")).toThrow(/appears more than once/);
  });

  it("rejects over-wide and under-wide rows instead of dropping cells", () => {
    expect(() => createDataSet("id,name\n1,A,UNACCOUNTED\n2,B")).toThrow(/Source row 2 has 3 fields.*header has 2.*no cells are lost/);
    expect(() => createDataSet("id,name\n1\n2,B")).toThrow(/Source row 2 has 1 fields.*header has 2/);
  });
});

describe("deterministic transforms", () => {
  it("normalizes valid dates and rejects impossible ones", () => {
    expect(transformValue("31/01/26", { ...baseMapping, transform: "date-dmy" }).value).toBe("2026-01-31");
    expect(transformValue("31/31/26", { ...baseMapping, transform: "date-dmy" }).error).toMatch(/not a valid/);
  });

  it("cleans currency and applies exact replacement", () => {
    expect(transformValue(" $1,240.50 ", { ...baseMapping, transform: "number" }).value).toBe("1240.5");
    expect(transformValue("NORTH-NORTH", { ...baseMapping, transform: "replace", find: "NORTH", replace: "N" }).value).toBe("N-N");
  });

  it("uses defaults before required validation", () => {
    expect(transformValue("", { ...baseMapping, defaultValue: "UNKNOWN", required: true }).value).toBe("UNKNOWN");
    expect(transformValue("", { ...baseMapping, required: true }).error).toMatch(/required value is blank/);
  });
});

describe("processing ledger", () => {
  it("isolates invalid and duplicate rows with explicit source reasons", () => {
    const rows = [
      { id: "A", date: "31/01/2026" },
      { id: "A", date: "31/01/2026" },
      { id: "B", date: "31/31/2026" },
    ];
    const mappings: FieldMapping[] = [
      { ...baseMapping, target: "customer_id", source: "id", required: true },
      { ...baseMapping, target: "start_date", source: "date", transform: "date-dmy", required: true },
    ];
    const result = processRows(rows, mappings, ["customer_id"]);
    expect(result.accepted).toEqual([{ customer_id: "A", start_date: "2026-01-31" }]);
    expect(result.rejected).toHaveLength(2);
    expect(result.rejected[0]?.reasons[0]).toMatch(/Duplicate of source row 2/);
    expect(result.rejected[1]?.reasons[0]).toMatch(/start_date/);
    expect(result.duplicates).toBe(1);
  });

  it("lets a valid row claim a key after an invalid row with the same key", () => {
    const rows = [
      { id: "A", date: "31/02/2024" },
      { id: "A", date: "29/02/2024" },
    ];
    const mappings: FieldMapping[] = [
      { ...baseMapping, target: "id", source: "id", required: true },
      { ...baseMapping, target: "date", source: "date", transform: "date-dmy", required: true },
    ];
    const result = processRows(rows, mappings, ["id"]);
    expect(result.accepted).toEqual([{ id: "A", date: "2024-02-29" }]);
    expect(result.rejected).toHaveLength(1);
    expect(result.rejected[0]).toMatchObject({ sourceRow: 2, duplicate: false });
    expect(result.duplicates).toBe(0);
  });
});

describe("portable artifacts", () => {
  it("round-trips escaped output CSV", () => {
    const csv = toCSV(["name", "note"], [{ name: "Ana, Lee", note: 'A "quote"' }]);
    expect(parseCSV(csv)[1]).toEqual(["Ana, Lee", 'A "quote"']);
  });

  it("writes and validates diffable recipe JSON", () => {
    const recipe: Recipe = {
      schema: "import-transform-ledger/recipe", version: 1, name: "Customers", createdAt: "2026-01-01T00:00:00.000Z",
      sourceHeaders: ["id"], targetHeaders: ["id"], mappings: initialMappings(["id"], ["id"]), dedupeKeys: ["id"],
    };
    const json = recipeJSON(recipe);
    expect(json).toContain('\n  "mappings"');
    expect(validateRecipe(JSON.parse(json))).toEqual(recipe);
    expect(() => validateRecipe({ version: 2 })).toThrow(/not a supported/);
  });

  it("rejects recipes with undeclared targets, unsupported transforms, or invalid dedupe keys", () => {
    const recipe: Recipe = {
      schema: "import-transform-ledger/recipe", version: 1, name: "Corrupt", createdAt: "2026-01-01T00:00:00.000Z",
      sourceHeaders: ["id"], targetHeaders: ["id"], mappings: initialMappings(["id"], ["id"]), dedupeKeys: [],
    };
    expect(() => validateRecipe({ ...recipe, mappings: [{ ...recipe.mappings[0], target: "wrong" }] })).toThrow(/undeclared target header/);
    expect(() => validateRecipe({ ...recipe, mappings: [{ ...recipe.mappings[0], transform: "bogus" }] })).toThrow(/unsupported transform/);
    expect(() => validateRecipe({ ...recipe, dedupeKeys: ["missing"] })).toThrow(/not a target header/);
  });
});

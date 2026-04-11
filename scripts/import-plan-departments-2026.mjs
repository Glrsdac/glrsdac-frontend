import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import * as dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const dbUrl = process.env.SUPABASE_DB_URL;
if (!dbUrl) {
  console.error("❌ SUPABASE_DB_URL not set");
  process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataPath = path.resolve(__dirname, "data", "gloryland_plan_2026_raw.json");

if (!fs.existsSync(dataPath)) {
  console.error(`❌ Data file not found: ${dataPath}`);
  process.exit(1);
}

const SOURCE_LABEL = "Gloryland SDA Church Plan 2026";

const cleanText = (value) => {
  if (value == null) return "";
  return String(value)
    .replace(/â€™/g, "'")
    .replace(/â€“/g, "-")
    .replace(/â€œ|â€/g, '"')
    .replace(/Â/g, "")
    .replace(/\s+/g, " ")
    .trim();
};

const normalizeSpaces = (value) => cleanText(value).replace(/\s+/g, " ").trim();

const canonicalDepartmentName = (value) => {
  const text = normalizeSpaces(value);
  if (!text) return null;

  const lower = text.toLowerCase();

  if (["all depts.", "all depts", "all departments", "church", "all dept"].includes(lower)) {
    return null;
  }

  if (lower === "pm") return "Personal Ministries";
  if (lower === "church elder") return "Church Elders";
  if (lower === "elders") return "Church Elders";

  let canonical = text
    .replace(/\bdept\.?\b/gi, "Department")
    .replace(/\bministries\b/gi, "Ministries")
    .replace(/\s+department\s+department/gi, " Department")
    .replace(/\s+/g, " ")
    .trim();

  canonical = canonical
    .split(" ")
    .map((part) => {
      if (part.toUpperCase() === "PM") return "PM";
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join(" ");

  return canonical;
};

const splitDepartmentField = (value) => {
  const raw = normalizeSpaces(value);
  if (!raw) return [];

  return raw
    .split(/\s*\/\s*|\s*,\s*|\s*&\s*|\s+and\s+/gi)
    .map((part) => canonicalDepartmentName(part))
    .filter(Boolean);
};

const looksLikeDepartment = (value) => {
  const lower = normalizeSpaces(value).toLowerCase();
  if (!lower) return false;
  return /(elder|minist|department|dept|sabbath school|health|stewardship|music|family|children|youth|personal ministries|pm)/i.test(lower);
};

const rawJson = fs.readFileSync(dataPath, "utf8").replace(/^\uFEFF/, "");
const rows = JSON.parse(rawJson);

const candidateDepartments = new Set();

for (const row of rows) {
  const fromDepartment = splitDepartmentField(row.department);
  for (const value of fromDepartment) candidateDepartments.add(value);

  if (fromDepartment.length === 0 && looksLikeDepartment(row.sabbath_school)) {
    const fallback = canonicalDepartmentName(row.sabbath_school);
    if (fallback) candidateDepartments.add(fallback);
  }
}

if (candidateDepartments.size === 0) {
  console.log("No department candidates found in plan data.");
  process.exit(0);
}

const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  await client.query("BEGIN");

  const sortedDepartments = Array.from(candidateDepartments).sort((a, b) => a.localeCompare(b));
  const inserted = [];

  for (const departmentName of sortedDepartments) {
    const sql = `
      INSERT INTO public.departments (name, description, is_active)
      VALUES ($1, $2, true)
      ON CONFLICT ((lower(btrim(name)))) DO UPDATE
      SET is_active = true
      RETURNING id, name
    `;

    const result = await client.query(sql, [
      departmentName,
      `Imported from ${SOURCE_LABEL}`,
    ]);

    if (result.rows[0]) {
      inserted.push(result.rows[0].name);
    }
  }

  await client.query("COMMIT");

  console.log(`✅ Synced ${sortedDepartments.length} plan department names`);
  console.log(`✅ Upserted ${inserted.length} department rows`);
  console.log("Departments:");
  for (const name of sortedDepartments) {
    console.log(` - ${name}`);
  }
} catch (error) {
  await client.query("ROLLBACK");
  console.error("❌ Department sync failed:", error.message);
  process.exit(1);
} finally {
  await client.end();
}

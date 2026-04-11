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

const MONTH_MAP = {
  JANUARY: 1,
  FEBRUARY: 2,
  MARCH: 3,
  APRIL: 4,
  MAY: 5,
  JUNE: 6,
  JULY: 7,
  AUGUST: 8,
  SEPTEMBER: 9,
  OCTOBER: 10,
  NOVEMBER: 11,
  DECEMBER: 12,
};

const SOURCE_DOC = "Gloryland SDA Church Plan - 2026.odt";
const PLAN_YEAR = 2026;

const cleanText = (value) => {
  if (value == null) return "";
  const raw = String(value).trim();
  if (!raw) return "";

  return raw
    .replace(/â€™/g, "'")
    .replace(/â€“/g, "-")
    .replace(/â€œ|â€/g, '"')
    .replace(/Â/g, "")
    .replace(/\s+/g, " ")
    .trim();
};

const normalizeKey = (value) =>
  cleanText(value)
    .toLowerCase()
    .replace(/dept\.?/g, "department")
    .replace(/ministries/g, "ministry")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const toNullable = (value) => {
  const cleaned = cleanText(value);
  return cleaned.length > 0 ? cleaned : null;
};

const parseDayNumber = (value) => {
  const cleaned = cleanText(value);
  if (!cleaned) return null;
  const match = cleaned.match(/^\d{1,2}$/);
  if (!match) return null;
  const day = Number(match[0]);
  if (day < 1 || day > 31) return null;
  return day;
};

const monthSaturdays = (year, month) => {
  const dates = [];
  const date = new Date(Date.UTC(year, month - 1, 1));
  while (date.getUTCMonth() === month - 1) {
    if (date.getUTCDay() === 6) {
      dates.push(new Date(date.getTime()));
    }
    date.setUTCDate(date.getUTCDate() + 1);
  }
  return dates;
};

const toIsoDate = (year, month, day) => {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.toISOString().slice(0, 10);
};

const deriveDepartmentName = (departmentRaw) => {
  const value = cleanText(departmentRaw);
  if (!value) return null;

  const generic = [
    "all depts",
    "all departments",
    "church",
  ];

  const lower = value.toLowerCase();
  if (generic.includes(lower)) return null;

  const split = value
    .split(/[\/,&]|\band\b/gi)
    .map((part) => cleanText(part))
    .filter(Boolean);

  if (split.length === 0) return null;
  const first = split[0];

  if (/^pm$/i.test(first)) return "Personal Ministries";
  if (/church elder/i.test(first)) return "Elders";
  if (/women ministry/i.test(first)) return "Women Ministries";
  if (/health & temperance/i.test(first)) return "Health and Temperance";

  return first;
};

const createEventName = (row) => {
  const program = cleanText(row.program);
  if (program) return program;
  const dayText = cleanText(row.day);
  if (dayText && !/^\d{1,2}$/.test(dayText)) return dayText;
  const afternoon = cleanText(row.afternoon_program);
  if (afternoon) return afternoon;
  const theme = cleanText(row.sabbath_school);
  if (theme) return theme;
  return "Church Program";
};

const createDescription = (row) => {
  const lines = [];
  const day = cleanText(row.day);
  const sabbath = cleanText(row.sabbath_school);
  const afternoon = cleanText(row.afternoon_program);
  const lead = cleanText(row.lead);

  if (day && !/^\d{1,2}$/.test(day)) lines.push(`Plan Note: ${day}`);
  if (sabbath) lines.push(`Sabbath School: ${sabbath}`);
  if (afternoon) lines.push(`Afternoon Program: ${afternoon}`);
  if (lead) lines.push(`Lead: ${lead}`);

  return lines.length > 0 ? lines.join("\n") : null;
};

const rawJson = fs.readFileSync(dataPath, "utf8").replace(/^\uFEFF/, "");
const rawRows = JSON.parse(rawJson);

const rows = rawRows
  .map((row) => ({
    month: cleanText(row.month).toUpperCase(),
    day: row.day,
    program: row.program,
    department: row.department,
    sabbath_school: row.sabbath_school,
    afternoon_program: row.afternoon_program,
    lead: row.lead,
  }))
  .filter((row) => MONTH_MAP[row.month]);

const rowsByMonth = new Map();
for (const row of rows) {
  const month = MONTH_MAP[row.month];
  if (!rowsByMonth.has(month)) rowsByMonth.set(month, []);
  rowsByMonth.get(month).push(row);
}

const eventsToInsert = [];
for (const [month, monthRows] of rowsByMonth.entries()) {
  const saturdays = monthSaturdays(PLAN_YEAR, month);
  let saturdayIndex = 0;

  for (const row of monthRows) {
    const explicitDay = parseDayNumber(row.day);
    const planDay = explicitDay;

    let eventDate = null;
    if (explicitDay) {
      eventDate = toIsoDate(PLAN_YEAR, month, explicitDay);
    } else if (saturdays.length > 0) {
      const assigned = saturdays[Math.min(saturdayIndex, saturdays.length - 1)];
      eventDate = assigned.toISOString().slice(0, 10);
      saturdayIndex += 1;
    }

    eventsToInsert.push({
      name: createEventName(row),
      description: createDescription(row),
      event_date: eventDate,
      program_level: "local_church",
      department_name: deriveDepartmentName(row.department),
      plan_year: PLAN_YEAR,
      plan_month: month,
      plan_day: planDay,
      sabbath_school_theme: toNullable(row.sabbath_school),
      afternoon_program: toNullable(row.afternoon_program),
      lead_person: toNullable(row.lead),
      source_document: SOURCE_DOC,
      is_published: true,
    });
  }
}

const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  await client.query("BEGIN");

  const { rows: departmentRows } = await client.query(
    "SELECT id, name FROM public.departments WHERE is_active = true"
  );

  const departmentIdByKey = new Map(
    departmentRows.map((row) => [normalizeKey(row.name), row.id])
  );

  const missingDepartments = new Set(
    eventsToInsert
      .map((event) => event.department_name)
      .filter(Boolean)
      .filter((name) => !departmentIdByKey.has(normalizeKey(name)))
  );

  for (const departmentName of missingDepartments) {
    const insertDepartmentSql = `
      INSERT INTO public.departments (name, description, is_active)
      VALUES ($1, $2, true)
      ON CONFLICT ((lower(btrim(name)))) DO UPDATE
      SET is_active = true
      RETURNING id, name
    `;

    const result = await client.query(insertDepartmentSql, [
      departmentName,
      `Auto-created from ${SOURCE_DOC}`,
    ]);

    if (result.rows[0]) {
      departmentIdByKey.set(normalizeKey(result.rows[0].name), result.rows[0].id);
    }
  }

  await client.query(
    "DELETE FROM public.events WHERE source_document = $1 AND plan_year = $2",
    [SOURCE_DOC, PLAN_YEAR]
  );

  const insertEventSql = `
    INSERT INTO public.events (
      name,
      description,
      event_date,
      program_level,
      department_id,
      is_published,
      plan_year,
      plan_month,
      plan_day,
      lead_person,
      source_document
    ) VALUES (
      $1,
      $2,
      $3,
      $4::public.program_level,
      $5,
      $6,
      $7,
      $8,
      $9,
      $10,
      $11
    )
  `;

  for (const event of eventsToInsert) {
    const departmentId = event.department_name
      ? departmentIdByKey.get(normalizeKey(event.department_name)) ?? null
      : null;

    await client.query(insertEventSql, [
      event.name,
      event.description,
      event.event_date,
      event.program_level,
      departmentId,
      event.is_published,
      event.plan_year,
      event.plan_month,
      event.plan_day,
      event.lead_person,
      event.source_document,
    ]);
  }

  await client.query("COMMIT");
  console.log(`✅ Imported ${eventsToInsert.length} programs from ${SOURCE_DOC}`);
} catch (error) {
  await client.query("ROLLBACK");
  console.error("❌ Import failed:", error.message);
  process.exit(1);
} finally {
  await client.end();
}

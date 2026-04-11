import * as dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const dbUrl = process.env.SUPABASE_DB_URL;
if (!dbUrl) {
  console.error("❌ SUPABASE_DB_URL not set");
  process.exit(1);
}

const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

const normalizeName = (value) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/&/g, " and ")
    .replace(/\s+/g, " ")
    .trim();

const quoteIdent = (value) => `"${String(value).replace(/"/g, '""')}"`;

const CANONICAL_MAP = new Map([
  ["elders", "Church Elders"],
  ["church elder", "Church Elders"],
  ["church elders", "Church Elders"],

  ["women ministry", "Women Ministries"],
  ["women ministries dept", "Women Ministries"],
  ["women ministries department", "Women Ministries"],

  ["stewardship dept", "Stewardship Department"],

  ["health", "Health and Temperance"],
  ["health dept", "Health and Temperance"],
  ["health department", "Health and Temperance"],
  ["temperance", "Health and Temperance"],

  ["family", "Home and Family"],
  ["home", "Home and Family"],
  ["family life department", "Home and Family"],

  ["all depts", "Church-wide"],
  ["all departments", "Church-wide"],
]);

try {
  await client.connect();
  await client.query("BEGIN");

  const { rows: departmentRows } = await client.query(
    `SELECT id, name, description, created_at
     FROM public.departments
     ORDER BY created_at ASC, name ASC`
  );

  const canonicalNameById = new Map();
  for (const row of departmentRows) {
    const normalized = normalizeName(row.name);
    const canonical = CANONICAL_MAP.get(normalized) || row.name;
    canonicalNameById.set(row.id, canonical);
  }

  const { rows: fkTables } = await client.query(
    `SELECT table_schema, table_name
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND column_name = 'department_id'
       AND table_name <> 'departments'`
  );

  const canonicalIdByName = new Map();

  for (const row of departmentRows) {
    const canonicalName = canonicalNameById.get(row.id);
    if (!canonicalName) continue;

    if (!canonicalIdByName.has(canonicalName)) {
      const upsertResult = await client.query(
        `INSERT INTO public.departments (name, description, is_active)
         VALUES ($1, $2, true)
         ON CONFLICT ((lower(btrim(name)))) DO UPDATE
         SET is_active = true
         RETURNING id`,
        [canonicalName, `Normalized from imported 2026 plan`] 
      );

      canonicalIdByName.set(canonicalName, upsertResult.rows[0].id);
    }
  }

  let remapCount = 0;
  const remapPairs = [];

  for (const row of departmentRows) {
    const sourceId = row.id;
    const canonicalName = canonicalNameById.get(sourceId);
    const targetId = canonicalIdByName.get(canonicalName);
    if (!targetId || sourceId === targetId) continue;
    remapPairs.push({ sourceId, targetId, sourceName: row.name, targetName: canonicalName });
  }

  for (const pair of remapPairs) {
    for (const tableRow of fkTables) {
      const fullTable = `${quoteIdent(tableRow.table_schema)}.${quoteIdent(tableRow.table_name)}`;
      const result = await client.query(
        `UPDATE ${fullTable}
         SET department_id = $1
         WHERE department_id = $2`,
        [pair.targetId, pair.sourceId]
      );
      remapCount += result.rowCount || 0;
    }

    await client.query(`DELETE FROM public.departments WHERE id = $1`, [pair.sourceId]);
  }

  const { rows: finalRows } = await client.query(
    `SELECT id, name
     FROM public.departments
     ORDER BY name ASC`
  );

  await client.query("COMMIT");

  console.log(`✅ Normalized department variants`);
  console.log(`✅ Merged records: ${remapPairs.length}`);
  console.log(`✅ FK remaps applied: ${remapCount}`);
  console.log(`✅ Final department count: ${finalRows.length}`);
} catch (error) {
  await client.query("ROLLBACK");
  console.error("❌ Normalization failed:", error.message);
  process.exit(1);
} finally {
  await client.end();
}

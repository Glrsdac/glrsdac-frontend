import pg from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const dbUrl = process.env.SUPABASE_DB_URL;
if (!dbUrl) {
  console.error('❌ SUPABASE_DB_URL not set');
  process.exit(1);
}

const DAYBORN_MATCH_SQL = "(LOWER(name) LIKE '%day born%' OR LOWER(name) LIKE '%dayborn%')";

async function fixDaybornFund() {
  const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();
    await client.query('BEGIN');

    const daybornFunds = await client.query(
      `SELECT id, name, fund_group_id, local_percentage, district_percentage, conference_percentage, allocation_type
       FROM public.funds
       WHERE ${DAYBORN_MATCH_SQL}
       ORDER BY id`
    );

    if (daybornFunds.rows.length === 0) {
      console.log('ℹ️ No Day Born fund found.');
      await client.query('ROLLBACK');
      return;
    }

    let projectGroup = await client.query(
      `SELECT id, name
       FROM public.fund_groups
       WHERE LOWER(name) LIKE '%project%'
       ORDER BY id
       LIMIT 1`
    );

    if (projectGroup.rows.length === 0) {
      const inserted = await client.query(
        `INSERT INTO public.fund_groups (name, description, is_active)
         VALUES ('Projects', 'Project Funds', true)
         RETURNING id, name`
      );
      projectGroup = inserted;
      console.log(`✅ Created fund group: ${inserted.rows[0].name} (id=${inserted.rows[0].id})`);
    }

    const projectGroupId = projectGroup.rows[0].id;

    const updated = await client.query(
      `UPDATE public.funds
       SET local_percentage = 100,
           district_percentage = 0,
           conference_percentage = 0,
           allocation_type = 'LOCAL',
           is_member_tracked = true,
           fund_group_id = $1
       WHERE ${DAYBORN_MATCH_SQL}
       RETURNING id, name, fund_group_id, local_percentage, district_percentage, conference_percentage, allocation_type, is_member_tracked`,
      [projectGroupId]
    );

    await client.query('COMMIT');

    console.log('✅ Day Born fund normalization complete.');
    console.log(`   Updated rows: ${updated.rows.length}`);
    updated.rows.forEach((row) => {
      console.log(
        `   - [${row.id}] ${row.name}: Local ${row.local_percentage}% / District ${row.district_percentage}% / Conference ${row.conference_percentage}%, type=${row.allocation_type}, member_tracked=${row.is_member_tracked}, group_id=${row.fund_group_id}`
      );
    });
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // ignore rollback error
    }
    console.error('❌ Failed to normalize Day Born fund:', error.message || error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

fixDaybornFund();

import pg from 'pg';
const { Client } = pg;

const dbUrl = process.env.SUPABASE_DB_URL;

if (!dbUrl) {
  console.error('Missing SUPABASE_DB_URL');
  process.exit(1);
}

const client = new Client({
  connectionString: dbUrl,
});

try {
  await client.connect();
  
  // Check roles
  const rolesResult = await client.query('SELECT name, category FROM roles ORDER BY category, name');
  console.log(`\n✅ ${rolesResult.rows.length} Roles seeded:`);
  rolesResult.rows.forEach(row => {
    console.log(`  [${row.category}] ${row.name}`);
  });
  
  // Check permissions
  const permsResult = await client.query('SELECT COUNT(*) as count FROM permissions');
  console.log(`\n✅ ${permsResult.rows[0].count} Permissions seeded`);
  
  // Check role_permissions mappings
  const rpResult = await client.query(`
    SELECT r.name, COUNT(rp.permission_id) as perm_count
    FROM roles r
    LEFT JOIN role_permissions rp ON r.id = rp.role_id
    GROUP BY r.name
    ORDER BY r.name
  `);
  console.log(`\n✅ Role → Permission mappings:`);
  rpResult.rows.forEach(row => {
    console.log(`  ${row.name}: ${row.perm_count} permissions`);
  });
  
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
} finally {
  await client.end();
}

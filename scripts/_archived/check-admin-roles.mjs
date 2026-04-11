import pg from 'pg';
const { Client } = pg;

const dbUrl = process.env.SUPABASE_DB_URL;

const client = new Client({
  connectionString: dbUrl,
});

try {
  await client.connect();
  
  // Check admin user's roles
  const result = await client.query(`
    SELECT 
      p.email,
      p.full_name,
      r.name as role_name,
      r.category,
      ur.scope_type,
      ur.is_active,
      ur.end_date
    FROM user_roles ur
    JOIN auth.users au ON ur.user_id = au.id
    JOIN profiles p ON ur.user_id = p.id
    JOIN roles r ON ur.role_id = r.id
    WHERE p.email = 'admin@glrsdac.com'
    ORDER BY ur.is_active DESC, r.name
  `);
  
  console.log('\n✅ Admin user roles:');
  if (result.rows.length === 0) {
    console.log('❌ No roles found for admin@glrsdac.com');
  } else {
    result.rows.forEach(row => {
      console.log(`  ${row.email}: ${row.role_name} [${row.category}] (${row.scope_type}, active: ${row.is_active})`);
    });
  }
  
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
} finally {
  await client.end();
}

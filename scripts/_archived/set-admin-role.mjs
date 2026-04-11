import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const client = new pg.Client({
  connectionString: process.env.SUPABASE_DB_URL,
});

async function updateUserRole() {
  try {
    await client.connect();

    const adminEmail = process.env.ADMIN_EMAIL || "admin@glrsdac.com";
    const userResult = await client.query(
      "SELECT id FROM auth.users WHERE email = $1",
      [adminEmail]
    );

    if (userResult.rows.length === 0) {
      console.error("❌ Admin user not found:", adminEmail);
      return;
    }

    const userId = userResult.rows[0].id;

    const adminRoleName = process.env.ADMIN_ROLE_NAME || 'SuperAdmin';

    // Get admin role ID
    const roleResult = await client.query(
      'SELECT id FROM roles WHERE name = $1',
      [adminRoleName]
    );

    if (roleResult.rows.length === 0) {
      console.error(`❌ ${adminRoleName} role not found`);
      return;
    }

    const roleId = roleResult.rows[0].id;
    console.log(`✓ Found ${adminRoleName} role:`, roleId);

    // Check if user already has admin role (global scope)
    const existingResult = await client.query(
      'SELECT id FROM user_roles WHERE user_id = $1 AND role_id = $2 AND is_active = true AND (scope_type IS NULL OR scope_type = $3) AND scope_id IS NULL',
      [userId, roleId, 'global']
    );

    if (existingResult.rows.length > 0) {
      console.log(`✓ User already has ${adminRoleName} role (global)`);
      return;
    }

    // Revoke any existing global roles
    await client.query(
      'UPDATE user_roles SET is_active = false WHERE user_id = $1 AND (scope_type IS NULL OR scope_type = $2) AND scope_id IS NULL',
      [userId, 'global']
    );
    console.log('✓ Revoked existing global roles');

    // Assign admin role
    const today = new Date().toISOString().split('T')[0];
    const twoYearsLater = new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    const insertResult = await client.query(
      `INSERT INTO user_roles (user_id, role_id, scope_type, start_date, end_date, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [userId, roleId, 'global', today, twoYearsLater, true]
    );

    console.log(`✅ ${adminRoleName} role assigned successfully`);
    console.log('   User ID:', userId);
    console.log('   Role ID:', roleId);
    console.log('   Scope: global');
    console.log('   Validity: 2 years');

    await client.query(
      "UPDATE profiles SET user_type = 'system_admin' WHERE id = $1",
      [userId]
    );

    // Verify
    const verifyResult = await client.query(
      `SELECT ur.id, ur.scope_type, ur.start_date, ur.end_date, ur.is_active, r.name
       FROM user_roles ur
       JOIN roles r ON ur.role_id = r.id
       WHERE ur.user_id = $1 AND ur.is_active = true`,
      [userId]
    );

    console.log('\n📋 User roles:');
    verifyResult.rows.forEach(row => {
      console.log(`   - ${row.name} [${row.scope_type}] (${row.start_date} to ${row.end_date})`);
    });
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

updateUserRole();

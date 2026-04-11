# Database Management Scripts

This directory contains Node.js scripts to directly manage your Supabase database. All scripts use your `.env` configuration.

## Setup

Before using these scripts, you need to add your Supabase service role key to your `.env` file:

```bash
# Get your service role key from:
# 1. Go to: https://app.supabase.com
# 2. Your project > Settings > API
# 3. Copy the "service_role" key
SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY_HERE"
```

Also install dependencies:
```bash
npm install
```

## Available Scripts

### 📋 List/Query Database

```bash
# List all records from a table
npm run db:query -- list members

# Count records in a table
npm run db:query -- count funds

# Get table structure info
npm run db:query -- info cheques
```

### 🌱 Seed Database

Populate database with sample data (departments, funds, bank accounts, sessions):

```bash
npm run db:seed
```

### 🔄 Run Migrations

Apply SQL migrations from `supabase/migrations/`:

```bash
npm run db:migrate
```

> **Note**: Due to Supabase limitations, migrations may need to be run manually via the Supabase Dashboard > SQL Editor if using the RPC approach. Copy the SQL from `supabase/migrations/` and paste into the editor.

### ✅ Option B Integrity Check

Validate that database structure/data still conforms to the Option B RBAC model:

```bash
npm run db:check:optionb
```

This checks:
- Department roles are always department scoped
- Members have at least one active role
- SuperAdmin is always global scoped
- Core role/permission counts are present

### 📤 Export Data

Export all database records to JSON file:

```bash
# Export everything
npm run db:export

# Export specific table
npm run db:export members
```

Exports are saved to the `exports/` directory with timestamps.

### 🗑️ Clear Data

Clear specific tables (development only):

```bash
# Show available tables
npm run db:clear

# Clear specific table
npm run db:clear -- imprest_expenses

# Clear ALL data (requires --force)
npm run db:clear:all -- --force
```

## Common Use Cases

### Setup new environment

```bash
npm run db:migrate    # Apply schema migrations
npm run db:seed       # Populate with test data
```

### Backup before testing

```bash
npm run db:export
```

### Reset development data

```bash
npm run db:clear -- imprest_expenses    # Clear expenses
npm run db:clear -- contributions       # Clear contributions
```

### Check what's in the database

```bash
npm run db:query -- count members
npm run db:query -- list funds
npm run db:query -- info cheques
```

## API Reference

### Query with custom logic

For more complex queries, you can import the client directly:

```javascript
import { supabaseAdmin } from './scripts/db.utils.js';

const { data, error } = await supabaseAdmin
  .from('members')
  .select('*')
  .eq('status', 'ACTIVE');

console.log(data);
```

## Troubleshooting

**"SUPABASE_SERVICE_ROLE_KEY not found"**
- Add the key to your `.env` file (see Setup section above)

**"Permission denied" errors**
- Make sure you're using the `service_role` key, not the public key
- Check that the key is valid and not expired

**"Table not found" errors**
- Make sure migrations have been applied
- Run: `npm run db:migrate`

## Safety Notes

⚠️ These scripts have direct database access. Use with caution in production!

- The `clear` commands will delete data permanently (required --force confirmation)
- Always backup with `db:export` before major changes
- Review scripts before using with production databases
- Never commit `.env` files with real credentials

## Adding New Scripts

1. Create a new `.js` file in `scripts/` directory
2. Import `supabaseAdmin` and/or `supabase` from `./db.utils.js`
3. Add the npm command to `package.json`
4. Test with: `npm run [command]`

Example:

```javascript
// scripts/my-script.js
import { supabaseAdmin } from './db.utils.js';

const doSomething = async () => {
  const { data, error } = await supabaseAdmin
    .from('members')
    .select('*');
  console.log(data);
};

doSomething().catch(err => {
  console.error(err);
  process.exit(1);
});
```

Then add to `package.json`:
```json
"db:my-script": "node scripts/my-script.js"
```

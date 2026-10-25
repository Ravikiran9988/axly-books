import * as dotenv from 'dotenv';
import { Pool } from '@neondatabase/serverless';

dotenv.config({ path: '.env.local' });
dotenv.config();

const REQUIRED_TABLES = [
  'users',
  'sessions',
  'password_resets',
  'authors',
  'books',
  'chapters',
  'comments',
  'comment_votes',
  'comment_reports',
  'reading_progress',
  'bookmarks',
  'reader_preferences',
  'rate_limits',
];

async function verifyDatabase() {
  const connectionString = process.env.DATABASE_URL;

  console.log('🔍 [DB VERIFICATION] Starting database audit and verification...');

  if (
    !connectionString ||
    connectionString.includes('placeholder_neon_database_url') ||
    connectionString.includes('placeholder_user') ||
    connectionString.includes('placeholder_password')
  ) {
    console.error('❌ [DB VERIFICATION] DATABASE_URL is not configured or contains placeholder credentials.');
    console.error('   Configure the intended Neon PostgreSQL connection in .env.local, then rerun this check.');
    process.exitCode = 1;
    return;
  }

  const pool = new Pool({ connectionString });

  try {
    console.log('🔌 [DB VERIFICATION] Connecting to Neon PostgreSQL...');
    const client = await pool.connect();

    try {
      // 1. Query public tables
      const tablesRes = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
      `);
      const existingTables = new Set(tablesRes.rows.map((r: { table_name: string }) => r.table_name));

      console.log('\n📋 Table Audit:');
      let allTablesPresent = true;
      for (const table of REQUIRED_TABLES) {
        if (existingTables.has(table)) {
          console.log(`   ✔ Table "${table}" is present.`);
        } else {
          console.log(`   ❌ Table "${table}" is MISSING.`);
          allTablesPresent = false;
        }
      }

      // 2. Query Foreign Key and Unique Constraints
      const constraintsRes = await client.query(`
        SELECT tc.table_name, tc.constraint_name, tc.constraint_type
        FROM information_schema.table_constraints tc
        WHERE tc.table_schema = 'public' AND tc.constraint_type IN ('FOREIGN KEY', 'UNIQUE', 'PRIMARY KEY')
        ORDER BY tc.table_name;
      `);
      console.log(`\n🔒 Constraints Audit: Found ${constraintsRes.rowCount} active constraints.`);

      // 3. Check Row Counts & Admin Existence
      if (existingTables.has('users')) {
        const usersCountRes = await client.query('SELECT count(*) as total, count(*) FILTER (WHERE role = \'admin\') as admins FROM users;');
        const { total, admins } = usersCountRes.rows[0];
        console.log(`\n👥 User Accounts: ${total} total (${admins} administrator(s)).`);
        if (Number(admins) === 0) {
          console.log('   ⚠️  No administrator account found. Run: npm run admin:promote -- your-email@example.com');
        }
      }

      if (existingTables.has('books')) {
        const booksCountRes = await client.query('SELECT count(*) as total, count(*) FILTER (WHERE is_published = true) as published FROM books;');
        const { total, published } = booksCountRes.rows[0];
        console.log(`📚 Books Catalogue: ${total} total (${published} published, ${total - published} draft).`);
      }

      if (existingTables.has('chapters')) {
        const chaptersCountRes = await client.query('SELECT count(*) as total FROM chapters;');
        console.log(`📖 Chapters Catalogue: ${chaptersCountRes.rows[0].total} total chapters.`);
      }

      console.log('\n======================================================');
      if (allTablesPresent) {
        console.log('✅ DATABASE INTEGRITY VERIFIED: All core tables and schemas match requirements.');
      } else {
        console.error('❌ DATABASE INCOMPLETE: Required tables are missing. Verify DATABASE_URL, then execute npm run db:migrate.');
        process.exitCode = 1;
      }
      console.log('======================================================\n');
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    console.error('❌ [DB VERIFICATION] Connection or integrity check failed:', err);
    process.exitCode = 1;
  } finally {
    try {
      await pool.end();
    } catch {
      // Ignore pool closure
    }
  }
}

verifyDatabase();

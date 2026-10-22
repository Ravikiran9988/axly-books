import * as dotenv from 'dotenv';
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { migrate } from 'drizzle-orm/neon-serverless/migrator';

dotenv.config({ path: '.env.local' });
dotenv.config();

async function runMigrations() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString || connectionString.includes('placeholder_user') || connectionString.includes('placeholder_password')) {
    console.error('❌ [MIGRATIONS] DATABASE_URL is not configured or contains placeholder credentials.');
    console.error('To apply migrations, provide a valid Neon PostgreSQL connection string in .env.local:');
    console.error('DATABASE_URL="postgresql://user:password@ep-xxxx-pooler.us-east-2.aws.neon.tech/dbname?sslmode=require"');
    process.exit(1);
  }

  console.log('🚀 [MIGRATIONS] Initializing Neon PostgreSQL migration runner...');
  const pool = new Pool({ connectionString });
  const db = drizzle(pool);

  try {
    console.log('📦 [MIGRATIONS] Applying versioned migrations from ./drizzle...');
    await migrate(db, { migrationsFolder: './drizzle' });
    console.log('✅ [MIGRATIONS] All versioned migrations applied successfully.');
  } catch (err: unknown) {
    console.error('❌ [MIGRATIONS] Migration execution failed:', err);
    process.exit(1);
  } finally {
    try {
      await pool.end();
    } catch {
      // Ignore pool closure warning
    }
  }
}

runMigrations();

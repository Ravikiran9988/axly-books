import { neon, Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

const databaseUrl = process.env.DATABASE_URL;

export function isDatabaseConfigured(): boolean {
  return Boolean(
    databaseUrl &&
      databaseUrl.startsWith('postgres') &&
      !databaseUrl.includes('placeholder_neon_database_url')
  );
}

// Lazy/safe initialization so Next.js build and non-configured states never throw unhandled connection errors
function getDb() {
  if (isDatabaseConfigured() && databaseUrl) {
    const sql = neon(databaseUrl);
    return drizzle(sql, { schema });
  }
  return null;
}

export const db = getDb();
export { schema };

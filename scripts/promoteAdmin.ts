import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../src/db/schema';

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email({ message: 'Must be a valid email address.' });

async function main() {
  console.log('🛡️  AXLY Books — Administrator Account Provisioning Tool\n');

  // 1. Verify database connection string
  const databaseUrl = process.env.DATABASE_URL;
  const isConfigured = Boolean(
    databaseUrl &&
      databaseUrl.startsWith('postgres') &&
      !databaseUrl.includes('placeholder_user') &&
      !databaseUrl.includes('placeholder_password') &&
      !databaseUrl.includes('placeholder_neon_database_url')
  );

  if (!isConfigured || !databaseUrl) {
    console.error('❌ Error: A valid, connected Neon PostgreSQL database is required.');
    console.error('👉 Please configure DATABASE_URL in .env.local before running this command.');
    process.exit(1);
  }

  // 2. Parse and validate email argument
  const targetEmailRaw = process.argv[2];
  if (!targetEmailRaw) {
    console.error('❌ Error: Missing target user email argument.');
    console.error('👉 Usage: npm run admin:promote -- <user-email>');
    console.error('   Example: npm run admin:promote -- ravikiran@axly.in\n');
    process.exit(1);
  }

  const parseResult = emailSchema.safeParse(targetEmailRaw);
  if (!parseResult.success) {
    console.error(`❌ Error: "${targetEmailRaw}" is not a valid email address.`);
    process.exit(1);
  }

  const normalizedEmail = parseResult.data;

  // 3. Connect to Neon database
  console.log('📡 Connecting to Neon database...');
  const sql = neon(databaseUrl);
  const db = drizzle(sql, { schema });

  // 4. Query target user account
  const matchingUsers = await db
    .select({
      id: schema.users.id,
      displayName: schema.users.displayName,
      email: schema.users.email,
      role: schema.users.role,
      createdAt: schema.users.createdAt,
    })
    .from(schema.users)
    .where(eq(schema.users.email, normalizedEmail))
    .limit(1);

  if (matchingUsers.length === 0) {
    console.error(`❌ Account Not Found: No registered user exists with email "${normalizedEmail}".`);
    console.error('👉 The user must first register an account on AXLY Books (at /register).');
    console.error('   After registration, re-run this command to elevate their role.\n');
    process.exit(1);
  }

  const user = matchingUsers[0];

  // 5. Idempotent check
  if (user.role === 'admin') {
    console.log(`ℹ️  User "${user.email}" (${user.displayName}, ID: ${user.id}) is ALREADY an administrator.`);
    console.log('✅ No changes were required. The account retains full administrative access.\n');
    process.exit(0);
  }

  // 6. Elevate role to admin
  const now = new Date();
  await db
    .update(schema.users)
    .set({
      role: 'admin',
      updatedAt: now,
    })
    .where(eq(schema.users.id, user.id));

  console.log('🎉 Elevation Successful!');
  console.log(`   User:         ${user.displayName}`);
  console.log(`   Email:        ${user.email}`);
  console.log(`   User ID:      ${user.id}`);
  console.log(`   Previous Role: ${user.role}`);
  console.log(`   New Role:     admin`);
  console.log('\n✅ The user can now log in at /login and access the administrator dashboard at /admin.\n');
}

main().catch((err) => {
  console.error('❌ An unexpected error occurred during admin provisioning:', err.message || err);
  process.exit(1);
});

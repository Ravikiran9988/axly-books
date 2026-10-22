import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, schema, isDatabaseConfigured } from '@/db';
import { getCurrentUser } from '@/lib/auth';
import { preferencesUpdateSchema } from '@/lib/validations';

interface PreferencesData {
  fontSize: number;
  lineHeight: number;
  readingTheme: string;
  fontFamily: string;
  distractionFree: boolean;
}

const DEFAULT_PREFERENCES: PreferencesData = {
  fontSize: 18,
  lineHeight: 1.75,
  readingTheme: 'light',
  fontFamily: 'serif',
  distractionFree: false,
};

const inMemoryPreferences = new Map<string, PreferencesData>();

export async function GET(request?: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ preferences: DEFAULT_PREFERENCES });
    }

    if (process.env.NODE_ENV === 'production' && (!isDatabaseConfigured() || !db)) {
      return NextResponse.json(
        { error: 'Persistent database service is not configured.' },
        { status: 503 }
      );
    }

    if (isDatabaseConfigured() && db) {
      const records = await db
        .select()
        .from(schema.readerPreferences)
        .where(eq(schema.readerPreferences.userId, user.id))
        .limit(1);

      if (records.length > 0) {
        const r = records[0];
        return NextResponse.json({
          preferences: {
            fontSize: r.fontSize,
            lineHeight: r.lineHeight,
            readingTheme: r.readingTheme,
            fontFamily: r.fontFamily,
            distractionFree: r.distractionFree,
          },
        });
      }
    }

    const fallback = inMemoryPreferences.get(user.id) || DEFAULT_PREFERENCES;
    return NextResponse.json({ preferences: fallback });
  } catch (err: unknown) {
    console.error('Fetch preferences error:', err);
    return NextResponse.json({ preferences: DEFAULT_PREFERENCES });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (process.env.NODE_ENV === 'production' && (!isDatabaseConfigured() || !db)) {
      return NextResponse.json(
        { error: 'Persistent database service is not configured.' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const parseResult = preferencesUpdateSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message || 'Invalid preferences.' },
        { status: 400 }
      );
    }

    const updates = parseResult.data;
    const now = new Date();

    if (isDatabaseConfigured() && db) {
      await db
        .insert(schema.readerPreferences)
        .values({
          userId: user.id,
          fontSize: updates.fontSize || DEFAULT_PREFERENCES.fontSize,
          lineHeight: updates.lineHeight || DEFAULT_PREFERENCES.lineHeight,
          readingTheme: updates.readingTheme || DEFAULT_PREFERENCES.readingTheme,
          fontFamily: updates.fontFamily || DEFAULT_PREFERENCES.fontFamily,
          distractionFree: updates.distractionFree ?? DEFAULT_PREFERENCES.distractionFree,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: schema.readerPreferences.userId,
          set: {
            ...(updates.fontSize !== undefined && { fontSize: updates.fontSize }),
            ...(updates.lineHeight !== undefined && { lineHeight: updates.lineHeight }),
            ...(updates.readingTheme !== undefined && { readingTheme: updates.readingTheme }),
            ...(updates.fontFamily !== undefined && { fontFamily: updates.fontFamily }),
            ...(updates.distractionFree !== undefined && {
              distractionFree: updates.distractionFree,
            }),
            updatedAt: now,
          },
        });

      return NextResponse.json({ success: true, preferences: updates });
    }

    // In-memory fallback
    const current = inMemoryPreferences.get(user.id) || DEFAULT_PREFERENCES;
    const next: PreferencesData = {
      fontSize: updates.fontSize ?? current.fontSize,
      lineHeight: updates.lineHeight ?? current.lineHeight,
      readingTheme: updates.readingTheme ?? current.readingTheme,
      fontFamily: updates.fontFamily ?? current.fontFamily,
      distractionFree: updates.distractionFree ?? current.distractionFree,
    };
    inMemoryPreferences.set(user.id, next);

    return NextResponse.json({ success: true, preferences: next });
  } catch (err: unknown) {
    console.error('Update preferences error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred while saving reading preferences.' },
      { status: 500 }
    );
  }
}

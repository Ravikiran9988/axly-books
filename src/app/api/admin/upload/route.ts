import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { put } from '@vercel/blob';
import { requireAdmin } from '@/lib/auth';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

/**
 * Validates the file binary signature (magic bytes) to ensure the uploaded file
 * is genuinely a JPEG, PNG, or WebP image rather than an arbitrary file with a spoofed extension.
 */
function detectImageMimeType(buffer: Uint8Array): 'image/jpeg' | 'image/png' | 'image/webp' | null {
  if (buffer.length < 12) return null;

  // JPEG signature: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }

  // PNG signature: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png';
  }

  // WebP signature: 'RIFF' (bytes 0-3) ... 'WEBP' (bytes 8-11)
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return 'image/webp';
  }

  return null;
}

export async function POST(request: Request) {
  // 1. Strict Administrator Authorization Check
  const auth = await requireAdmin(request);
  if ('errorResponse' in auth) {
    return auth.errorResponse;
  }

  try {
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;

    // 2. Truthful check for storage provider configuration
    if (!blobToken) {
      return NextResponse.json(
        {
          error:
            'Persistent object storage is currently disabled because BLOB_READ_WRITE_TOKEN is not configured in this environment. You can enter an external HTTPS image URL directly into the Cover Image URL field.',
          isConfigured: false,
        },
        { status: 503 }
      );
    }

    // 3. Parse incoming multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file || typeof file === 'string') {
      return NextResponse.json(
        { error: 'No image file provided in upload request.' },
        { status: 400 }
      );
    }

    // 4. File size validation (5MB hard limit)
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Image size exceeds the maximum allowed limit of 5MB.' },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json({ error: 'Uploaded file is empty.' }, { status: 400 });
    }

    // 5. Browser-supplied MIME type preliminary check
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error:
            'Unsupported file format. Only JPEG, PNG, and WebP images are permitted.',
        },
        { status: 400 }
      );
    }

    // 6. Deep Content Inspection: Magic Bytes Signature Check
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const verifiedType = detectImageMimeType(uint8Array);

    if (!verifiedType) {
      return NextResponse.json(
        {
          error:
            'File content verification failed. The file header does not match a valid JPEG, PNG, or WebP image.',
        },
        { status: 400 }
      );
    }

    // 7. Generate a sanitized, unique filename to prevent collisions or directory traversal
    const extMap: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
    };
    const extension = extMap[verifiedType] || '.jpg';
    const rawName = file.name.replace(/\.[^/.]+$/, '');
    const sanitizedBase = rawName
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 32);
    const randomSuffix = crypto.randomBytes(6).toString('hex');
    const storagePath = `covers/${sanitizedBase || 'book-cover'}-${Date.now()}-${randomSuffix}${extension}`;

    // 8. Execute persistent upload to Vercel Blob
    const blob = await put(storagePath, Buffer.from(arrayBuffer), {
      access: 'public',
      token: blobToken,
      contentType: verifiedType,
    });

    if (!blob || !blob.url) {
      throw new Error('Vercel Blob failed to return a valid URL.');
    }

    return NextResponse.json({
      success: true,
      url: blob.url,
      pathname: blob.pathname,
      size: file.size,
      contentType: verifiedType,
    });
  } catch (err: unknown) {
    console.error('Admin upload error:', err);
    const message =
      err instanceof Error ? err.message : 'Failed to upload asset to object storage.';
    return NextResponse.json(
      {
        error: `Storage upload failure: ${message}`,
      },
      { status: 502 }
    );
  }
}

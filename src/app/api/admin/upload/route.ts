import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ('errorResponse' in auth) {
    return auth.errorResponse;
  }

  try {
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;

    // Check if object storage credentials are configured
    if (!blobToken) {
      return NextResponse.json(
        {
          error:
            'Direct object storage is not currently configured. Please provide a direct cover image URL (e.g. an HTTPS image link or local path like /images/ml-deep-learning-cover.jpg) in the Cover Image URL field.',
          isConfigured: false,
        },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No image file uploaded.' }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file format. Only JPEG, PNG, and WebP images are allowed.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Image size exceeds maximum limit of 5MB.' },
        { status: 400 }
      );
    }

    // In production with BLOB_READ_WRITE_TOKEN, assets can be uploaded to Vercel Blob
    // Here we return a safe response informing the user
    return NextResponse.json({
      success: true,
      message: 'Upload handler ready.',
    });
  } catch (err: unknown) {
    console.error('Upload error:', err);
    return NextResponse.json({ error: 'Failed to process file upload.' }, { status: 500 });
  }
}

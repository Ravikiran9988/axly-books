import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';

const MAX_PDF_BYTES = 25 * 1024 * 1024;

export async function POST(request: Request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: 'PDF storage is not configured. Set BLOB_READ_WRITE_TOKEN before importing books.' },
      { status: 503 },
    );
  }

  let body: HandleUploadBody;
  try {
    body = await request.json() as HandleUploadBody;
  } catch {
    return NextResponse.json({ error: 'Invalid upload request.' }, { status: 400 });
  }

  try {
    const jsonResponse = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const auth = await requireAdmin(request);
        if ('errorResponse' in auth) {
          throw new Error('Administrator access is required to upload book PDFs.');
        }

        if (!pathname.toLowerCase().endsWith('.pdf')) {
          throw new Error('Only PDF files can be uploaded as book originals.');
        }
        if (clientPayload !== JSON.stringify({ purpose: 'book-original-pdf' })) {
          throw new Error('Invalid book PDF upload purpose.');
        }

        return {
          allowedContentTypes: ['application/pdf'],
          maximumSizeInBytes: MAX_PDF_BYTES,
          addRandomSuffix: true,
          validUntil: Date.now() + 10 * 60 * 1000,
        };
      },
      onUploadCompleted: async ({ blob }) => {
        if (!blob.pathname.toLowerCase().endsWith('.pdf')) {
          throw new Error('Uploaded file is not a PDF.');
        }
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error('Book PDF direct upload failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not authorize PDF upload.' },
      { status: 400 },
    );
  }
}

export interface PublicationEligibility {
  totalChapters: number;
  hasPublishedChapter: boolean;
  allowPdfDownload: boolean;
  originalPdfPath: string | null | undefined;
}

/**
 * Online-reading books need at least one published chapter.
 * Download-only books may publish without chapters only when a private original
 * PDF exists and downloads are explicitly enabled.
 */
export function isBookPublishable(input: PublicationEligibility): boolean {
  if (input.hasPublishedChapter) return true;
  return input.totalChapters === 0
    && input.allowPdfDownload
    && Boolean(input.originalPdfPath);
}

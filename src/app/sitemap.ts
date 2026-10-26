import { MetadataRoute } from 'next';
import { getServerPublishedBooks } from '@/services/serverBookService';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://books.axly.in';
  const lastModified = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/books`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/author/slayer`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/about`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];

  const bookRoutes: MetadataRoute.Sitemap = [];
  const books = await getServerPublishedBooks();
  books.forEach((book) => {
    bookRoutes.push({
      url: `${baseUrl}/books/${book.slug}`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.9,
    });
    bookRoutes.push({
      url: `${baseUrl}/read/${book.slug}`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.8,
    });
  });

  return [...staticRoutes, ...bookRoutes];
}

import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://books.axly.in';

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/books', '/books/*', '/read/*', '/author/*', '/about', '/privacy', '/terms'],
        disallow: ['/profile', '/my-library', '/api/*', '/login', '/register', '/forgot-password'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

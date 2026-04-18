import type { MetadataRoute } from 'next';
import { locales } from '@/i18n/routing';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://eatrivo.com';
  
  // Define your public routes here
  const routes = [
    '',
    '/onboarding',
  ];

  const sitemapEntries: MetadataRoute.Sitemap = [];

  routes.forEach((route) => {
    locales.forEach((locale) => {
      // Prioritize Slovak content slightly higher
      const basePriority = route === '' ? 1 : 0.8;
      const localePriority = locale === 'sk' ? basePriority : basePriority - 0.1;
      
      sitemapEntries.push({
        url: `${baseUrl}/${locale}${route}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: Number(localePriority.toFixed(1)),
      });
    });
  });

  return sitemapEntries;
}

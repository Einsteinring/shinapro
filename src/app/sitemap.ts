import type { MetadataRoute } from "next";
import { services } from "@/config/services";
import { siteConfig } from "@/config/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    { url: siteConfig.url, lastModified, changeFrequency: "weekly", priority: 1 },
    ...services.map((s) => ({
      url: `${siteConfig.url}/services/${s.slug}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    { url: `${siteConfig.url}/privacy`, lastModified, changeFrequency: "yearly", priority: 0.2 },
  ];
}

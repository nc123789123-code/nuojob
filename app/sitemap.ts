import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://onluintel.com";
  return [
    { url: base,               lastModified: new Date(), changeFrequency: "hourly",  priority: 1.0 },
    { url: `${base}/about`,    lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/contact`,  lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/terms`,    lastModified: new Date(), changeFrequency: "yearly",  priority: 0.3 },
    { url: `${base}/privacy`,  lastModified: new Date(), changeFrequency: "yearly",  priority: 0.3 },
  ];
}

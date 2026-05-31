import { MetadataRoute } from "next";
import { getAllPosts } from "@/app/lib/posts";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://onluintel.com";
  const posts = getAllPosts().map((p) => ({
    url: `${base}/learn/${p.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));
  return [
    { url: base,               lastModified: new Date(), changeFrequency: "hourly",  priority: 1.0 },
    { url: `${base}/about`,    lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/contact`,  lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/terms`,    lastModified: new Date(), changeFrequency: "yearly",  priority: 0.3 },
    { url: `${base}/privacy`,  lastModified: new Date(), changeFrequency: "yearly",  priority: 0.3 },
    ...posts,
  ];
}

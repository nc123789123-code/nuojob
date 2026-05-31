import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteNav from "@/app/components/SiteNav";
import SiteFooter from "@/app/components/SiteFooter";
import { getAllPosts, getPostBySlug, TAG_STYLES } from "@/app/lib/posts";

export async function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};
  const description = post.paragraphs?.[0]?.slice(0, 160) ?? `${post.title} — Onlu finance intelligence.`;
  return {
    title: `${post.title} — Onlu`,
    description,
    openGraph: { title: post.title, description, siteName: "Onlu" },
  };
}

export default async function LearnPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  return (
    <div className="min-h-screen bg-[#f7f9fb] flex flex-col" style={{ fontFamily: "'Nunito', sans-serif" }}>
      <SiteNav />

      <div className="border-b border-gray-100 bg-white">
        <div className="max-w-3xl mx-auto px-5 h-10 flex items-center gap-2 text-xs text-gray-400">
          <Link href="/?tab=learn" className="hover:text-[#396477] transition-colors">Onlu Learning</Link>
          <span>›</span>
          <span className="text-gray-600 truncate">{post.title}</span>
        </div>
      </div>

      <main className="flex-1 w-full max-w-3xl mx-auto px-5 py-10">
        <article className="bg-white border border-gray-100 rounded-2xl p-6 sm:p-10 shadow-sm">
          <header className="mb-8">
            {post.tag && (
              <span className={`inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full mb-3 ${TAG_STYLES[post.tag] ?? "bg-gray-100 text-gray-600"}`}>
                {post.tag}
              </span>
            )}
            <h1 className="text-[#191c1e] text-2xl font-bold tracking-tight leading-snug mb-2">
              {post.title}
            </h1>
            <time className="text-xs text-[#71787c] font-medium">{post.date}</time>
          </header>

          <div className="space-y-4">
            {post.richContent ?? post.paragraphs.map((p, i) => (
              <p key={i} className="text-[#41484c] text-sm leading-[1.75]">{p}</p>
            ))}
          </div>
        </article>

        <div className="mt-8 text-center">
          <Link href="/?tab=learn" className="text-sm text-[#396477] hover:text-[#1A2B4A] transition-colors font-medium">
            ← Back to Onlu Learning
          </Link>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

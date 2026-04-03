import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/jobs(.*)",
  "/api/search(.*)",
  "/api/daily(.*)",
  "/api/news(.*)",
  "/api/fund(.*)",
  "/api/intel(.*)",
  "/api/subscribe(.*)",
  "/api/contact(.*)",
  "/api/webhooks(.*)",
  "/about(.*)",
  "/contact(.*)",
  "/privacy(.*)",
  "/terms(.*)",
  "/sitemap.xml",
  "/robots.txt",
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};

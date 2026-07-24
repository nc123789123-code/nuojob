import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        // The old on-site coffee landing now lives at its own domain.
        source: "/coffee",
        destination: "https://coffeewithonlu.com",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;

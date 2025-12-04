/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pub-cfdd9da14dd945a2bf1ea4e5b9b0ce2c.r2.dev',
        pathname: '/tokens/**',
      },
      {
        protocol: 'https',
        hostname: 'img.icons8.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'bonk-battle.vercel.app',
        pathname: '/r2/**',
      },
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
        pathname: '/**',
      },
    ],
  },
  // ⭐ PROXY: Serve immagini R2 attraverso Vercel
  async rewrites() {
    return [
      {
        source: '/r2/:path*',
        destination: 'https://pub-cfdd9da14dd945a2bf1ea4e5b9b0ce2c.r2.dev/:path*',
      },
    ];
  },
}

module.exports = nextConfig
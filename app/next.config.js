/** @type {import('next').NextConfig} */
const nextConfig = {
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
    ],
  },
}

module.exports = nextConfig
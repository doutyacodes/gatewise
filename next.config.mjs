/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'wowfy.in',
        pathname: '**',
      },
    ],
  },
};

export default nextConfig;

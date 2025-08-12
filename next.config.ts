/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Allow production builds to succeed even if there are ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // If type errors ever appear, don't block the build.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;

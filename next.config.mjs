/** @type {import('next').NextConfig} */
const nextConfig = {
  trailingSlash: true,
  images: {
    formats: ["image/avif", "image/webp"]
  },
  reactStrictMode: true
};

export default nextConfig;

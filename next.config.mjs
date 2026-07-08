/** @type {import('next').NextConfig} */
const nextConfig = {
  // resvg-js มี native binary (.node) ที่ webpack bundle ตรงๆ ไม่ได้ ต้องให้ Next.js
  // ปล่อยให้ Node require() มันตอน runtime แทนแทนที่จะพยายาม bundle
  experimental: {
    serverComponentsExternalPackages: ["@resvg/resvg-js"],
  },
};

export default nextConfig;

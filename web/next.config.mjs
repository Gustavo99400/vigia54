/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  // Needed for Leaflet
  transpilePackages: [],
};

export default nextConfig;

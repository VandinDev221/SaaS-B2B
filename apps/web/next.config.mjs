/** @type {import('next').NextConfig} */
const nextConfig = {
  typedRoutes: true,
  poweredByHeader: false,
  reactStrictMode: true,
  ...(process.env.NODE_ENV === "production" ? { output: "standalone" } : {})
};

export default nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  basePath: '/Token_Usage_Dashboard',
  assetPrefix: '/Token_Usage_Dashboard',
}

module.exports = nextConfig

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost'],
  },
  typescript: {
    // 跳过构建时的 TypeScript 错误检查
    ignoreBuildErrors: true,
  },
  eslint: {
    // 跳过构建时的 ESLint 检查
    ignoreDuringBuilds: true,
  },
  output: 'standalone',
}

module.exports = nextConfig
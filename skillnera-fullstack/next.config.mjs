/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'res.cloudinary.com',
                port: '',
                pathname: '/**',
                search: ''
            }
        ]
    },
     devIndicators: false,
         eslint: {
        ignoreDuringBuilds: true, // ⚠️ Bypasses ESLint errors during `next build`
      },
};

export default nextConfig;

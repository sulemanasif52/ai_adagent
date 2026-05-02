import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Local dev can point at the Railway backend (set VITE_API_TARGET in .env.local
// to https://aimarket-pro-production.up.railway.app) or default to the local
// Express server on :3000.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.VITE_API_TARGET || 'http://localhost:3000'
  const isRemote = apiTarget.startsWith('https://')

  return {
    plugins: [react()],
    server: {
      proxy: {
        // Same proxy config covers /api/* and /uploads/* (image gen output).
        ...['/api', '/uploads', '/videos'].reduce((acc, prefix) => {
          acc[prefix] = {
            target: apiTarget,
            changeOrigin: true,
            secure: isRemote,
            // Strip the cookie's Domain attribute so Set-Cookie from Railway
            // becomes a localhost cookie. Required so the session cookie
            // round-trips through the Vite proxy in dev.
            cookieDomainRewrite: { '*': '' },
            // Drop the Secure flag in dev so cookies survive on http://localhost.
            cookiePathRewrite: { '*': '/' },
            configure: isRemote ? (proxy) => {
              proxy.on('proxyRes', (proxyRes) => {
                const setCookie = proxyRes.headers['set-cookie']
                if (setCookie) {
                  proxyRes.headers['set-cookie'] = setCookie.map(c =>
                    c.replace(/;\s*Secure/gi, '')
                     .replace(/;\s*SameSite=None/gi, '; SameSite=Lax')
                     .replace(/;\s*Domain=[^;]+/gi, '')
                  )
                }
              })
            } : undefined,
          }
          return acc
        }, {}),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'recharts': ['recharts'],
            'framer': ['framer-motion'],
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'icons': ['lucide-react'],
          },
        },
      },
      chunkSizeWarningLimit: 700,
    },
  }
})

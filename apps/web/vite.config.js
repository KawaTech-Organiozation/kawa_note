import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import path from 'path'
import fs from 'fs'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  // Load .env from the project root directory (same directory as vite.config.js)
  const rootEnvPath = path.resolve(__dirname, '.env')
  let rootEnv = {}
  
  if (fs.existsSync(rootEnvPath)) {
    const envContent = fs.readFileSync(rootEnvPath, 'utf-8')
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=')
      if (key && key.startsWith('VITE_')) {
        rootEnv[key] = valueParts.join('=').trim()
      }
    })
  }

  return {
    logLevel: 'error', // Suppress warnings, only show errors
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        // manifest.json filename to match the <link rel="manifest"> in index.html
        manifestFilename: 'manifest.json',
        // Only reference assets that actually exist in public/
        includeAssets: ['favicon.svg', 'icon-192.svg', 'icon-512.svg', 'icon-maskable.svg', 'offline.html'],
        manifest: {
          name: 'Kawa Note',
          short_name: 'Kawa',
          description: 'Secure note-taking application with end-to-end encryption',
          theme_color: '#0f766e',
          background_color: '#ffffff',
          display: 'standalone',
          scope: '/',
          start_url: '/',
          // SVG icons (no PNG toolchain in this environment). Current Chrome/Edge
          // and Android accept SVG icons with sizes 'any' for installability.
          icons: [
            {
              src: '/icon-192.svg',
              sizes: '192x192',
              type: 'image/svg+xml',
              purpose: 'any'
            },
            {
              src: '/icon-512.svg',
              sizes: '512x512',
              type: 'image/svg+xml',
              purpose: 'any'
            },
            {
              src: '/icon-maskable.svg',
              sizes: 'any',
              type: 'image/svg+xml',
              purpose: 'maskable'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          globIgnores: ['**/node_modules/**/*', './**/*.map'],
          // SPA offline shell: unknown navigations fall back to the cached app
          // shell; API requests are never served from the fallback.
          navigateFallback: 'index.html',
          navigateFallbackDenylist: [/^\/api/],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 20,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
                }
              }
            },
            {
              urlPattern: /^\/api\/.*/,
              handler: 'NetworkOnly',
              options: {
                cacheName: 'api-cache'
              }
            }
          ]
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    define: {
      // process.env.VITE_* → valores injetados via ARG→ENV no Dockerfile (Docker build)
      // rootEnv.VITE_*    → valores lidos do .env local (dev local, .env excluído pelo .dockerignore)
      // A prioridade é: Docker ENV > .env local > default value
      'import.meta.env.VITE_APP_NAME': JSON.stringify(process.env.VITE_APP_NAME || rootEnv.VITE_APP_NAME || 'KawaMyCenter'),
      'import.meta.env.VITE_KAWA_APP_ID': JSON.stringify(process.env.VITE_KAWA_APP_ID || rootEnv.VITE_KAWA_APP_ID || 'test-app'),
      'import.meta.env.VITE_KAWA_FUNCTIONS_VERSION': JSON.stringify(process.env.VITE_KAWA_FUNCTIONS_VERSION || rootEnv.VITE_KAWA_FUNCTIONS_VERSION || 'v1'),
      'import.meta.env.VITE_KAWA_APP_BASE_URL': JSON.stringify(process.env.VITE_KAWA_APP_BASE_URL || rootEnv.VITE_KAWA_APP_BASE_URL || 'http://localhost:3116'),
      'import.meta.env.VITE_CEP_API_URL': JSON.stringify(process.env.VITE_CEP_API_URL || rootEnv.VITE_CEP_API_URL || ''),
    },
    server: {
      port: 3116,
      proxy: {
        '/api': {
          target: 'http://localhost:3115',
          changeOrigin: true,
        },
      },
    },
  };
});
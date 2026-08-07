import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

export default defineConfig({
  base: '/oac/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'branding/**/*'],
      manifest: {
        name: 'Registro de Solicitudes CVM',
        short_name: 'Solicitudes CVM',
        description: 'Registro de Solicitudes de Atención al Ciudadano · Corporación Venezolana de Minería',
        theme_color: '#8FA463',
        background_color: '#FAF8F2',
        display: 'standalone',
        lang: 'es',
        start_url: '/oac/',
        scope: '/oac/',
        icons: [
          {
            src: 'branding/logo_cvm.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'branding/logo_cvm.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'branding/logo_cvm.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        navigateFallback: '/oac/',
        navigateFallbackDenylist: [/\/api\//],
        runtimeCaching: [
          {
            urlPattern: /^https?:\/\/.*\/api\/v1\/catalogs/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'catalogs-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            urlPattern: /^https?:\/\/.*\/api\/v1\/census(\?.*)?$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'census-list-cache',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
          {
            urlPattern: /^https?:\/\/.*\/api\/v1\/census\/[^/]+$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'census-detail-cache',
              networkTimeoutSeconds: 5,
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 4701,
    proxy: {
      '/oac/api': {
        target: 'http://localhost:4700',
        changeOrigin: true,
        secure: false,
        rewrite: (p) => p.replace(/^\/oac\/api/, '/api'),
      },
      '/api': {
        target: 'http://localhost:4700',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});

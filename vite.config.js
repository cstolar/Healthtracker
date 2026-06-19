import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Reine Frontend-PWA: keine externen Requests, alles lokal.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Tagwerk – Gesundheits-Tagebuch',
        short_name: 'Tagwerk',
        description: 'Dein ruhiges Morgenritual. Privat, lokal, nur für dich.',
        theme_color: '#0e0e10',
        background_color: '#0e0e10',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        lang: 'de',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        // Alles vorab cachen -> sofort offline verfügbar. Keine Netzwerk-Strategien nötig.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallback: '/index.html'
      },
      devOptions: {
        enabled: false
      }
    })
  ]
})

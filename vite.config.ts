import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/time-capsule/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['camera.svg'],
      manifest: {
        name: 'Memory Vault',
        short_name: 'Memory Vault',
        description: '记录每一天的点滴',
        theme_color: '#F5F0E8',
        background_color: '#F5F0E8',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">📸</text></svg>', sizes: 'any', type: 'image/svg+xml' }
        ]
      }
    })
  ],
})

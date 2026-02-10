import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: { enabled: true }, // enable PWA in dev mode
      manifest: {
        name: 'ZimProject AI',
        short_name: 'ZimProject',
        description: 'A project helper for ZIMSEC students',
        start_url: '/',
        display: 'standalone',
        background_color: '#f0f4f8',
        theme_color: '#2563eb',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ]
});

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({ 
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true
      },
      manifest: {
        name: 'AffiongAI Clinical Decision Support System',
        short_name: 'AffiongAI',
        description: 'Microservice explainable system for chest x-ray analysis',
        theme_color: '#ffffff',
        icons: [
          {
            src: '/favicon.ico',
            sizes: '192x192',
            type: 'image/x-icon'
          }
        ]
      }
    })
  ],
})

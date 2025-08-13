import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 8080,
    host: true, // Allow external connections
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      // Allow all ngrok hosts
      '.ngrok-free.app',
      '.ngrok.io',
      '.ngrok.app'
    ],
    // CORS headers for Shopify
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  },
  define: {
    // Make environment variables available to the client
    'process.env': {}
  }
})

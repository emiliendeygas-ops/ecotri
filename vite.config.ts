
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  define: {
    // On définit process.env comme un objet vide par défaut pour éviter les plantages
    'process.env': {},
    // On injecte spécifiquement la clé API si elle est présente durant le build
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || '')
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
  server: {
    port: 3000,
  },
  build: {
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom', 'leaflet', '@google/genai'],
        },
      },
    },
  },
});

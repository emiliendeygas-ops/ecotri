import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  define: {
    // Fournit un objet global pour les bibliothèques (comme Leaflet ou GenAI) qui en ont besoin
    'global': 'window',
    // Assure que process.env est accessible comme un objet
    'process.env': {},
    // Injecte la clé API spécifique depuis les secrets du build
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
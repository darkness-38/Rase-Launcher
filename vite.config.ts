import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  base: './', // Ensures all built assets resolve relatively in Electron's file:// protocol
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  }
});

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@zayuno/contracts': path.resolve(__dirname, '../../packages/contracts/src'),
      '@zayuno/shared/redaction': path.resolve(__dirname, '../../packages/shared/src/redaction.ts'),
      '@zayuno/shared': path.resolve(__dirname, '../../packages/shared/src')
    }
  },
  server: {
    port: 3001,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true
      }
    }
  },
  preview: {
    port: 3001,
    host: '0.0.0.0',
    allowedHosts: true
  }
});

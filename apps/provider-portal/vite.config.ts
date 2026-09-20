import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { docsSitePlugin } from './scripts/docs-site';
import { devApiProxy } from './scripts/dev-api-proxy';

export default defineConfig(({ mode, command, isPreview }) => {
  const env = loadEnv(mode, __dirname, 'VITE_');
  const localDev = command === 'serve' && !isPreview;
  return {
    define: {
      'import.meta.env.VITE_USE_DEV_API_PROXY': JSON.stringify(localDev),
    },
    plugins: [react(), docsSitePlugin(path.resolve(__dirname, '../..'))],
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
        '/api': devApiProxy(env.VITE_API_URL || 'http://localhost:4000')
      }
    },
    preview: {
      port: 3001,
      host: '0.0.0.0',
      allowedHosts: true
    }
  };
});

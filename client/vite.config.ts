import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/ws': { target: 'ws://localhost:4000', ws: true },
      '/sessions': 'http://localhost:4000',
      '/proxies': 'http://localhost:4000',
      '/health': 'http://localhost:4000',
    },
  },
});

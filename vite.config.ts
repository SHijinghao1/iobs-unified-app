import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, type UserConfig } from 'vite';

// 统一 API 代理配置
const iobsProxy: NonNullable<UserConfig['server']>['proxy'] = {
  '/surgical-bed/iobs-api': {
    target: 'http://192.168.1.200:18011',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/surgical-bed\/iobs-api/, ''),
  },
  '/surgical-bed/iobs_api': {
    target: 'http://192.168.1.200:18011',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/surgical-bed\/iobs_api/, ''),
  },
  '/iobs-api': {
    target: 'http://192.168.1.200:18011',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/iobs-api/, ''),
  },
  '/iobs_api': {
    target: 'http://192.168.1.200:18011',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/iobs_api/, ''),
  },
  '/get_log': {
    target: 'http://192.168.1.200:18010',
    changeOrigin: true,
  },
  '/get_log_info': {
    target: 'http://192.168.1.200:18010',
    changeOrigin: true,
  },
  '/ws': {
    target: 'http://192.168.1.200:18010',
    changeOrigin: true,
    ws: true,
  },
};

export default defineConfig({
  base: '/',
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'motion',
      'motion/react',
      'react-router-dom',
    ],
    exclude: [],
  },
  server: {
    port: 3001,
    host: true,
    proxy: iobsProxy,
  },
  preview: {
    port: 3001,
    host: true,
    proxy: iobsProxy,
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
      },
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;

          if (id.includes('react') || id.includes('scheduler')) {
            return 'react-vendor';
          }

          if (id.includes('motion')) {
            return 'motion-vendor';
          }

          if (id.includes('recharts')) {
            return 'charts-vendor';
          }

          if (id.includes('urdf-loader')) {
            return 'urdf-vendor';
          }

          if (id.includes('@react-three/drei')) {
            return 'r3d-vendor';
          }

          if (id.includes('three') || id.includes('@react-three')) {
            return 'three-vendor';
          }
        },
      },
    }
  }
});
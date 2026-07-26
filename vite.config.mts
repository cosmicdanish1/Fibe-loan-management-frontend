import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { existsSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';

// ESM replacement for __dirname
const __dirname = fileURLToPath(new URL('.', import.meta.url));

function getBackendOrigin() {
  const fallback = 'http://localhost:3001';
  const configPath = resolve(__dirname, 'server-config.json');

  try {
    if (!existsSync(configPath)) return fallback;
    const parsed = JSON.parse(readFileSync(configPath, 'utf-8'));
    const serverIP = typeof parsed?.serverIP === 'string' ? parsed.serverIP.trim() : '';
    return serverIP ? `http://${serverIP}:3001` : fallback;
  } catch {
    return fallback;
  }
}

const backendOrigin = getBackendOrigin();

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  css: {
    modules: {
      localsConvention: 'camelCase',
      generateScopedName: '[name]__[local]___[hash:base64:5]',
    },

  },
  base: './',

  // Configure the development server
  server: {
    port: 5177,
    strictPort: true,
    headers: {
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' http://localhost:* ws://localhost:* wss://localhost:* http://*:3001; font-src 'self' data:; object-src 'none'; base-uri 'self';",
      'X-Frame-Options': 'SAMEORIGIN'
    },
    proxy: {
      '/api': {
        target: backendOrigin,
        changeOrigin: true,
        secure: false,
      },
    },
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 5177
    }
  },

  // Build configuration
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: true,
    sourcemap: process.env.NODE_ENV !== 'production',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html')
      },
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom']
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]'
      }
    },
    chunkSizeWarningLimit: 1000,
    minify: 'esbuild',
    target: 'esnext',
    reportCompressedSize: false
  },

  // Environment variables
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
  },

  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
    exclude: ['@electron-toolkit/utils']
  },

  // Vitest Configuration
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setupTests.ts'],
    include: ['tests/unit/**/*.{test,spec}.{ts,tsx}'],
  }
});

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import fs from 'fs';

/** Read the winning backend IP written by wait-for-backend.js, fall back to localhost */
function getBackendTarget(): string {
  try {
    const cfg = JSON.parse(fs.readFileSync('./server-config.json', 'utf-8'));
    const ip = (cfg.serverIP as string | undefined)?.trim() || 'localhost';
    return `http://${ip}:3001`;
  } catch {
    return 'http://localhost:3001';
  }
}

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
    // Proxy /api/* → backend (IP resolved from server-config.json by wait-for-backend.js)
    // This lets serverConfig.ts use the relative path '/api/v1' in Vite dev mode,
    // avoiding CORS issues whether the backend is on localhost or a LAN IP.
    proxy: {
      '/api': {
        target: getBackendTarget(),
        changeOrigin: true,
        secure: false,
      }
    },
    headers: {
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' http://localhost:* ws://localhost:* wss://localhost:*; font-src 'self' data:; object-src 'none'; base-uri 'self';",
      'X-Frame-Options': 'SAMEORIGIN'
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
        // This will help with chunk size warnings
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]'
      }
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
    // Minify for production
    minify: 'esbuild',
    // Target modern browsers
    target: 'esnext',
    // Reduce console noise
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
